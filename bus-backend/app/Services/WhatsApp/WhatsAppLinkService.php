<?php

namespace App\Services\WhatsApp;

use App\Models\User;
use App\Models\School;
use App\Models\WhatsAppAccount;
use App\Models\WhatsAppLinkToken;
use App\Services\AuditLogger;
use App\ValueObjects\WhatsAppIdentity;
use DomainException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class WhatsAppLinkService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /** @return array{token: string, expires_at: \Illuminate\Support\Carbon} */
    public function issueLinkToken(User $parent): array
    {
        return DB::transaction(function () use ($parent): array {
            $authoritativeParent = User::withoutGlobalScope('school')
                ->withTrashed()
                ->whereKey($parent->getKey())
                ->lockForUpdate()
                ->first();
            $this->assertEligibleParent($authoritativeParent, null, $parent->school_id);

            $plaintext = $this->base64UrlEncode(random_bytes(32));
            $expiresAt = now()->addMinutes((int) config('whatsapp.link_token_ttl_minutes', 10));

            $token = WhatsAppLinkToken::query()->where('user_id', $authoritativeParent->id)->first()
                ?? new WhatsAppLinkToken;
            $token->user_id = $authoritativeParent->id;
            $token->school_id = $authoritativeParent->school_id;
            $token->token_hash = hash('sha256', $plaintext);
            $token->expires_at = $expiresAt;
            $token->consumed_at = null;
            $token->revoked_at = null;

            try {
                $token->save();
            } catch (QueryException) {
                throw new DomainException('A link token could not be issued safely.');
            }

            $this->auditLogger->log([
                'action' => 'whatsapp_link_token_issued',
                'description' => 'A WhatsApp account-link token was issued.',
                'auditable' => $token,
                'school_id' => $authoritativeParent->school_id,
                'user_id' => $authoritativeParent->id,
            ]);

            return ['token' => $plaintext, 'expires_at' => $expiresAt];
        });
    }

    public function consumeLinkToken(string $plaintextToken, WhatsAppIdentity $identity): WhatsAppAccount
    {
        if ($plaintextToken === '') {
            throw new DomainException('The link token is invalid or unavailable.');
        }

        $tokenHash = hash('sha256', $plaintextToken);

        return DB::transaction(function () use ($tokenHash, $identity): WhatsAppAccount {
            $tokenSnapshot = WhatsAppLinkToken::query()->where('token_hash', $tokenHash)->first();
            if (! $tokenSnapshot) {
                throw new DomainException('The link token is invalid or unavailable.');
            }

            $parent = User::withoutGlobalScope('school')
                ->withTrashed()
                ->whereKey($tokenSnapshot->user_id)
                ->lockForUpdate()
                ->first();

            $claimedAt = now();
            $claimed = WhatsAppLinkToken::query()
                ->where('token_hash', $tokenHash)
                ->whereNull('consumed_at')
                ->whereNull('revoked_at')
                ->where('expires_at', '>', $claimedAt)
                ->update(['consumed_at' => $claimedAt, 'updated_at' => $claimedAt]);

            if ($claimed !== 1) {
                throw new DomainException('The link token is invalid or unavailable.');
            }

            $token = WhatsAppLinkToken::query()->where('token_hash', $tokenHash)->firstOrFail();
            $this->assertEligibleParent($parent, (int) $token->school_id);

            $identityData = $this->identityData($identity);
            $this->assertIdentityAvailable($identityData, (int) $parent->id);

            $account = WhatsAppAccount::query()->where('user_id', $parent->id)->first()
                ?? new WhatsAppAccount;
            $this->assertIdentityReplacementIsSafe($account, $identityData);

            $now = now();
            $account->user_id = $parent->id;
            $account->school_id = $parent->school_id;
            $account->status = 'linked';
            $this->mergeIdentity($account, $identityData);
            $account->verified_at = $now;
            $account->reverify_at = $now->copy()->addDays((int) config('whatsapp.reverify_days', 90));
            $account->revoked_at = null;
            $account->revocation_reason = null;
            $account->link_consent_version = (string) config('whatsapp.link_consent_version', '1');
            $account->consented_at = $now;

            try {
                $account->save();
            } catch (QueryException) {
                throw new DomainException('The WhatsApp identity is unavailable.');
            }

            $this->auditLogger->log([
                'action' => 'whatsapp_account_linked',
                'description' => 'A parent WhatsApp account was linked.',
                'auditable' => $account,
                'school_id' => $account->school_id,
                'user_id' => $account->user_id,
                'new_values' => ['status' => 'linked'],
            ]);

            return $account->fresh();
        });
    }

    public function revokeAccount(User $actor, WhatsAppAccount $account, string $reason): void
    {
        $this->assertCanManage($actor, $account);
        $safeReason = trim($reason);
        if ($safeReason === '' || strlen($safeReason) > 120) {
            throw new DomainException('A valid revocation reason is required.');
        }

        DB::transaction(function () use ($actor, $account, $safeReason): void {
            $account->status = 'revoked';
            $account->revoked_at = now();
            $account->revocation_reason = $safeReason;
            $account->save();

            $this->auditLogger->log([
                'action' => 'whatsapp_account_revoked',
                'severity' => 'warning',
                'description' => 'A parent WhatsApp account was revoked.',
                'auditable' => $account,
                'school_id' => $account->school_id,
                'user_id' => $actor->id,
                'old_values' => ['status' => 'linked'],
                'new_values' => ['status' => 'revoked'],
            ]);
        });
    }

    public function markReverificationRequired(WhatsAppAccount $account): void
    {
        $account->status = 'awaiting_reverification';
        $account->save();
    }

    public function requiresReverification(WhatsAppAccount $account): bool
    {
        return $account->status === 'awaiting_reverification'
            || $account->reverify_at === null
            || $account->reverify_at->isPast();
    }

    private function assertEligibleParent(?User $parent, ?int $expectedSchoolId = null, mixed $callerSchoolId = null): void
    {
        if (! $parent || $parent->trashed() || $parent->role !== 'parent' || $parent->status !== 'active') {
            throw new DomainException('This account is not eligible for WhatsApp linking.');
        }

        if ($parent->school_id === null
            || ($expectedSchoolId !== null && (int) $parent->school_id !== $expectedSchoolId)
            || ($callerSchoolId !== null && (int) $parent->school_id !== (int) $callerSchoolId)) {
            throw new DomainException('This account is not eligible for WhatsApp linking.');
        }

        $school = School::query()->whereKey($parent->school_id)->lockForUpdate()->first();
        if (! $school || ! $school->is_active) {
            throw new DomainException('This account is not eligible for WhatsApp linking.');
        }
    }

    /** @return array<string, mixed> */
    private function identityData(WhatsAppIdentity $identity): array
    {
        $key = config('whatsapp.identity_hash_key');
        $version = (string) config('whatsapp.identity_hash_key_version', '');
        if (! is_string($key) || strlen($key) < 32 || $version === '') {
            throw new RuntimeException('WhatsApp identity hashing is not configured.');
        }

        return [
            'bsuid_encrypted' => $identity->bsuid,
            'bsuid_hash' => $identity->bsuid === null ? null : hash_hmac('sha256', 'bsuid:'.$identity->bsuid, $key),
            'bsuid_hash_key_version' => $identity->bsuid === null ? null : $version,
            'destination_e164_encrypted' => $identity->destinationE164,
            'destination_e164_hash' => $identity->destinationE164 === null ? null : hash_hmac('sha256', 'phone:'.$identity->destinationE164, $key),
            'destination_hash_key_version' => $identity->destinationE164 === null ? null : $version,
            'destination_last_four' => $identity->destinationE164 === null ? null : substr($identity->destinationE164, -4),
        ];
    }

    /** @param array<string, mixed> $identityData */
    private function assertIdentityAvailable(array $identityData, int $userId): void
    {
        foreach (['bsuid_hash', 'destination_e164_hash'] as $field) {
            $hash = $identityData[$field];
            if ($hash !== null && WhatsAppAccount::query()->where($field, $hash)->where('user_id', '!=', $userId)->exists()) {
                throw new DomainException('The WhatsApp identity is unavailable.');
            }
        }
    }

    /** @param array<string, mixed> $identityData */
    private function assertIdentityReplacementIsSafe(WhatsAppAccount $account, array $identityData): void
    {
        if (! $account->exists) {
            return;
        }

        foreach (['bsuid_hash', 'destination_e164_hash'] as $field) {
            if ($account->{$field} !== null && $identityData[$field] !== null && ! hash_equals($account->{$field}, $identityData[$field])) {
                throw new DomainException('The existing WhatsApp identity requires a verified release.');
            }
        }
    }

    /** @param array<string, mixed> $identityData */
    private function mergeIdentity(WhatsAppAccount $account, array $identityData): void
    {
        foreach ([
            ['bsuid_encrypted', 'bsuid_hash', 'bsuid_hash_key_version'],
            ['destination_e164_encrypted', 'destination_e164_hash', 'destination_hash_key_version', 'destination_last_four'],
        ] as $fields) {
            $hashField = $fields[1];
            if ($identityData[$hashField] === null) {
                continue;
            }

            foreach ($fields as $field) {
                $account->{$field} = $identityData[$field];
            }
        }
    }

    private function assertCanManage(User $actor, WhatsAppAccount $account): void
    {
        $allowed = $actor->status === 'active' && (
            ($actor->role === 'parent' && (int) $actor->id === (int) $account->user_id)
            || ($actor->role === 'admin' && (int) $actor->school_id === (int) $account->school_id)
            || $actor->role === 'super_admin'
        );

        if (! $allowed) {
            throw new DomainException('You are not allowed to manage this WhatsApp account.');
        }
    }

    private function base64UrlEncode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
