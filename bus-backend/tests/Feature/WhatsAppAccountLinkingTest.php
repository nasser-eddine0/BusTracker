<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\WhatsAppLinkToken;
use App\Services\AuditLogger;
use App\Services\WhatsApp\PhoneNormalizer;
use App\Services\WhatsApp\WhatsAppLinkService;
use App\ValueObjects\WhatsAppIdentity;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class WhatsAppAccountLinkingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'whatsapp.identity_hash_key' => str_repeat('k', 32),
            'whatsapp.identity_hash_key_version' => 'test-v1',
            'whatsapp.link_token_ttl_minutes' => 10,
            'whatsapp.reverify_days' => 90,
            'whatsapp.link_consent_version' => 'test-consent-v1',
        ]);
    }

    public function test_only_an_active_parent_with_a_school_can_receive_a_link_token(): void
    {
        $school = $this->school();
        $parent = $this->user($school, 'parent');
        $issued = $this->service()->issueLinkToken($parent);

        $this->assertNotSame('', $issued['token']);
        $this->assertGreaterThanOrEqual(43, strlen($issued['token']));
        $this->assertDatabaseHas('whatsapp_link_tokens', [
            'user_id' => $parent->id,
            'school_id' => $school->id,
            'token_hash' => hash('sha256', $issued['token']),
        ]);
        $this->assertDatabaseMissing('whatsapp_link_tokens', ['token_hash' => $issued['token']]);
        $this->assertStringNotContainsString($issued['token'], WhatsAppLinkToken::first()->toJson());

        foreach (['admin', 'driver', 'super_admin'] as $role) {
            $schoolForRole = $role === 'super_admin' ? null : $school;
            $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($this->user($schoolForRole, $role)));
        }

        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($this->user($school, 'parent', 'disabled')));
        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($this->user(null, 'parent')));

        $inactiveSchool = $this->school('inactive', false);
        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($this->user($inactiveSchool, 'parent')));
    }

    public function test_valid_token_links_identity_once_with_encryption_hmac_and_reverification_deadline(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $issued = $this->service()->issueLinkToken($parent);
        $identity = $this->identity('bsuid-parent-one', '+212 (0) 6-12-34-56-78');

        $account = $this->service()->consumeLinkToken($issued['token'], $identity);

        $this->assertTrue($account->isUsable());
        $this->assertSame('bsuid-parent-one', $account->bsuid_encrypted);
        $this->assertSame('+212612345678', $account->destination_e164_encrypted);
        $this->assertSame('5678', $account->destination_last_four);
        $this->assertSame('test-v1', $account->bsuid_hash_key_version);
        $this->assertSame(hash_hmac('sha256', 'bsuid:bsuid-parent-one', str_repeat('k', 32)), $account->bsuid_hash);
        $this->assertSame(hash_hmac('sha256', 'phone:+212612345678', str_repeat('k', 32)), $account->destination_e164_hash);
        $this->assertNotSame($account->bsuid_hash, $account->destination_e164_hash);
        $this->assertEquals(90, $account->verified_at->startOfDay()->diffInDays($account->reverify_at->startOfDay()));
        $this->assertArrayNotHasKey('bsuid_encrypted', $account->toArray());
        $this->assertArrayNotHasKey('destination_e164_encrypted', $account->toArray());
        $this->assertArrayNotHasKey('bsuid_hash', $account->toArray());
        $this->assertArrayNotHasKey('destination_e164_hash', $account->toArray());
        $this->assertStringNotContainsString($account->bsuid_hash, $account->toJson());
        $this->assertStringNotContainsString($account->destination_e164_hash, $account->toJson());
        $this->assertNotSame('+212612345678', DB::table('whatsapp_accounts')->value('destination_e164_encrypted'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'whatsapp_account_linked', 'school_id' => $parent->school_id]);

        $sameCanonicalValue = '+212612345678';
        $this->assertNotSame(
            hash_hmac('sha256', 'bsuid:'.$sameCanonicalValue, str_repeat('k', 32)),
            hash_hmac('sha256', 'phone:'.$sameCanonicalValue, str_repeat('k', 32)),
        );

        $this->expectDomainFailure(fn () => $this->service()->consumeLinkToken($issued['token'], $identity));
        $this->assertSame(1, WhatsAppAccount::count());
    }

    public function test_token_issuance_reloads_authoritative_parent_and_school_state(): void
    {
        $school = $this->school('authority');

        $deactivated = $this->user($school, 'parent');
        User::withoutGlobalScope('school')->whereKey($deactivated->id)->update(['status' => 'disabled']);
        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($deactivated));

        $roleChanged = $this->user($school, 'parent');
        User::withoutGlobalScope('school')->whereKey($roleChanged->id)->update(['role' => 'driver']);
        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($roleChanged));

        $moved = $this->user($school, 'parent');
        $newSchool = $this->school('authority-new');
        User::withoutGlobalScope('school')->whereKey($moved->id)->update(['school_id' => $newSchool->id]);
        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($moved));

        $schoolDeactivated = $this->user($school, 'parent');
        $schoolDeactivated->setRelation('school', $school);
        School::query()->whereKey($school->id)->update(['is_active' => false]);
        $this->expectDomainFailure(fn () => $this->service()->issueLinkToken($schoolDeactivated));

        $this->assertDatabaseCount('whatsapp_link_tokens', 0);
    }

    public function test_expired_revoked_invalid_and_replaced_tokens_are_rejected(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $service = $this->service();

        $expired = $service->issueLinkToken($parent);
        WhatsAppLinkToken::query()->update(['expires_at' => now()->subSecond()]);
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($expired['token'], $this->identity('expired')));

        $revoked = $service->issueLinkToken($parent);
        WhatsAppLinkToken::query()->where('token_hash', hash('sha256', $revoked['token']))->update(['revoked_at' => now()]);
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($revoked['token'], $this->identity('revoked')));

        $replaced = $service->issueLinkToken($parent);
        $current = $service->issueLinkToken($parent);
        $this->assertDatabaseCount('whatsapp_link_tokens', 1);
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($replaced['token'], $this->identity('replaced')));
        $this->expectDomainFailure(fn () => $service->consumeLinkToken('not-a-valid-token', $this->identity('invalid')));

        $this->assertSame('linked', $service->consumeLinkToken($current['token'], $this->identity('current'))->status);
    }

    public function test_failed_reissuance_preserves_the_previously_valid_token(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $original = $this->service()->issueLinkToken($parent);
        $originalHash = hash('sha256', $original['token']);

        $audit = Mockery::mock(AuditLogger::class);
        $audit->shouldReceive('log')->once()->andThrow(new RuntimeException('Synthetic issuance audit failure.'));
        $this->app->instance(AuditLogger::class, $audit);

        try {
            $this->service()->issueLinkToken($parent);
            $this->fail('Reissuance unexpectedly succeeded.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Synthetic issuance audit failure.', $exception->getMessage());
        }

        $this->assertDatabaseCount('whatsapp_link_tokens', 1);
        $this->assertSame($originalHash, WhatsAppLinkToken::query()->value('token_hash'));

        $this->app->forgetInstance(AuditLogger::class);
        $account = $this->service()->consumeLinkToken($original['token'], $this->identity('preserved-token'));
        $this->assertSame($parent->id, $account->user_id);
    }

    public function test_independently_loaded_callers_cannot_create_multiple_usable_token_rows(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $callerA = User::withoutGlobalScope('school')->findOrFail($parent->id);
        $callerB = User::withoutGlobalScope('school')->findOrFail($parent->id);

        $first = $this->service()->issueLinkToken($callerA);
        $second = $this->service()->issueLinkToken($callerB);

        $this->assertDatabaseCount('whatsapp_link_tokens', 1);
        $this->expectDomainFailure(fn () => $this->service()->consumeLinkToken($first['token'], $this->identity('superseded-token')));
        $this->assertSame(
            $parent->id,
            $this->service()->consumeLinkToken($second['token'], $this->identity('latest-token'))->user_id,
        );
    }

    public function test_identity_cannot_be_reused_by_another_parent_or_school(): void
    {
        $schoolA = $this->school('A');
        $schoolB = $this->school('B');
        $first = $this->user($schoolA, 'parent');
        $second = $this->user($schoolB, 'parent');
        $service = $this->service();
        $identity = $this->identity('shared-bsuid', '0612345678');

        $service->consumeLinkToken($service->issueLinkToken($first)['token'], $identity);
        $secondToken = $service->issueLinkToken($second)['token'];

        $this->expectDomainFailure(fn () => $service->consumeLinkToken($secondToken, $identity));
        $this->assertSame(1, WhatsAppAccount::count());
        $this->assertNull(WhatsAppLinkToken::query()->where('token_hash', hash('sha256', $secondToken))->value('consumed_at'));
    }

    public function test_bsuid_and_phone_conflicts_are_enforced_independently(): void
    {
        $school = $this->school('independent-conflicts');
        $first = $this->user($school, 'parent');
        $second = $this->user($school, 'parent');
        $third = $this->user($school, 'parent');
        $service = $this->service();

        $service->consumeLinkToken($service->issueLinkToken($first)['token'], $this->identity('owned-bsuid', '0611111111'));
        $service->consumeLinkToken($service->issueLinkToken($second)['token'], $this->identity('other-bsuid', '0622222222'));

        $bsuidConflict = $service->issueLinkToken($third)['token'];
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($bsuidConflict, $this->identity('owned-bsuid', '0633333333')));

        $phoneConflict = $service->issueLinkToken($third)['token'];
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($phoneConflict, $this->identity('third-bsuid', '0622222222')));

        $this->assertDatabaseCount('whatsapp_accounts', 2);
    }

    public function test_token_claim_and_account_update_are_one_transaction(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $issued = $this->service()->issueLinkToken($parent);

        $audit = Mockery::mock(AuditLogger::class);
        $audit->shouldReceive('log')->once()->andThrow(new RuntimeException('Synthetic audit failure.'));
        $this->app->instance(AuditLogger::class, $audit);

        try {
            $this->service()->consumeLinkToken($issued['token'], $this->identity('rollback-bsuid'));
            $this->fail('Linking unexpectedly succeeded.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Synthetic audit failure.', $exception->getMessage());
        }

        $this->assertNull(WhatsAppLinkToken::query()->where('token_hash', hash('sha256', $issued['token']))->value('consumed_at'));
        $this->assertDatabaseCount('whatsapp_accounts', 0);
    }

    public function test_durable_account_rejects_silent_identity_replacement_and_supports_same_identity_reverification(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $service = $this->service();
        $identity = $this->identity('durable-bsuid', '0712345678');

        $account = $service->consumeLinkToken($service->issueLinkToken($parent)['token'], $identity);
        $service->revokeAccount($parent, $account, 'parent_requested');
        $this->assertFalse($account->fresh()->isUsable());

        $refreshed = $service->consumeLinkToken($service->issueLinkToken($parent)['token'], $identity);
        $this->assertSame($account->id, $refreshed->id);
        $this->assertTrue($refreshed->isUsable());

        $replacementToken = $service->issueLinkToken($parent)['token'];
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($replacementToken, $this->identity('different-bsuid', '0611111111')));
        $this->assertNull(WhatsAppLinkToken::query()->where('token_hash', hash('sha256', $replacementToken))->value('consumed_at'));
    }

    public function test_relinking_merges_omitted_and_new_identity_types_without_silent_release(): void
    {
        $school = $this->school('merge');
        $service = $this->service();

        $bothParent = $this->user($school, 'parent');
        $both = $service->consumeLinkToken(
            $service->issueLinkToken($bothParent)['token'],
            $this->identity('merge-both', '0612345678'),
        );
        $phoneHash = $both->destination_e164_hash;
        $bsuidHash = $both->bsuid_hash;

        $bsuidOnly = $service->consumeLinkToken(
            $service->issueLinkToken($bothParent)['token'],
            $this->identity('merge-both'),
        );
        $this->assertSame($phoneHash, $bsuidOnly->destination_e164_hash);
        $this->assertSame('+212612345678', $bsuidOnly->destination_e164_encrypted);

        $phoneOnly = $service->consumeLinkToken(
            $service->issueLinkToken($bothParent)['token'],
            $this->identity(null, '0612345678'),
        );
        $this->assertSame($bsuidHash, $phoneOnly->bsuid_hash);
        $this->assertSame('merge-both', $phoneOnly->bsuid_encrypted);

        $phoneParent = $this->user($school, 'parent');
        $phoneAccount = $service->consumeLinkToken(
            $service->issueLinkToken($phoneParent)['token'],
            $this->identity(null, '0622222222'),
        );
        $phoneWithBsuid = $service->consumeLinkToken(
            $service->issueLinkToken($phoneParent)['token'],
            $this->identity('added-bsuid'),
        );
        $this->assertSame($phoneAccount->destination_e164_hash, $phoneWithBsuid->destination_e164_hash);
        $this->assertSame('added-bsuid', $phoneWithBsuid->bsuid_encrypted);

        $bsuidParent = $this->user($school, 'parent');
        $bsuidAccount = $service->consumeLinkToken(
            $service->issueLinkToken($bsuidParent)['token'],
            $this->identity('bsuid-before-phone'),
        );
        $bsuidWithPhone = $service->consumeLinkToken(
            $service->issueLinkToken($bsuidParent)['token'],
            $this->identity(null, '0633333333'),
        );
        $this->assertSame($bsuidAccount->bsuid_hash, $bsuidWithPhone->bsuid_hash);
        $this->assertSame('+212633333333', $bsuidWithPhone->destination_e164_encrypted);
    }

    public function test_failed_identity_merge_leaves_original_account_unchanged(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $service = $this->service();
        $original = $service->consumeLinkToken(
            $service->issueLinkToken($parent)['token'],
            $this->identity('original-bsuid', '0612345678'),
        );
        $before = $original->only(['bsuid_hash', 'destination_e164_hash', 'verified_at', 'reverify_at']);

        $differentBsuid = $service->issueLinkToken($parent)['token'];
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($differentBsuid, $this->identity('different-bsuid')));
        $differentPhone = $service->issueLinkToken($parent)['token'];
        $this->expectDomainFailure(fn () => $service->consumeLinkToken($differentPhone, $this->identity(null, '0699999999')));

        $this->assertEquals($before, $original->fresh()->only(array_keys($before)));
    }

    public function test_account_marked_for_reverification_is_not_usable(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $service = $this->service();
        $account = $service->consumeLinkToken(
            $service->issueLinkToken($parent)['token'],
            $this->identity('reverification-bsuid', '0612345678'),
        );

        $service->markReverificationRequired($account);
        $account->refresh();

        $this->assertSame('awaiting_reverification', $account->status);
        $this->assertTrue($service->requiresReverification($account));
        $this->assertFalse($account->isUsable());
    }

    public function test_sensitive_models_are_fully_guarded_and_hide_secret_attributes(): void
    {
        $account = new WhatsAppAccount;
        try {
            $account->fill([
                'user_id' => 999,
                'school_id' => 999,
                'status' => 'linked',
                'bsuid_encrypted' => 'secret-bsuid',
                'bsuid_hash' => str_repeat('a', 64),
            ]);
            $this->fail('Sensitive WhatsApp account attributes were mass assignable.');
        } catch (MassAssignmentException) {
            $this->assertSame([], $account->getAttributes());
        }

        $token = new WhatsAppLinkToken;
        try {
            $token->fill([
                'user_id' => 999,
                'school_id' => 999,
                'token_hash' => str_repeat('b', 64),
                'consumed_at' => now(),
            ]);
            $this->fail('Sensitive WhatsApp token attributes were mass assignable.');
        } catch (MassAssignmentException) {
            $this->assertSame([], $token->getAttributes());
        }

        $token->token_hash = str_repeat('c', 64);
        $this->assertArrayNotHasKey('token_hash', $token->toArray());
        $this->assertStringNotContainsString(str_repeat('c', 64), $token->toJson());
    }

    public function test_hard_delete_cannot_erase_whatsapp_security_evidence(): void
    {
        $school = $this->school('retention');
        $parent = $this->user($school, 'parent');
        $service = $this->service();
        $service->consumeLinkToken(
            $service->issueLinkToken($parent)['token'],
            $this->identity('retained-bsuid', '0612345678'),
        );

        $this->assertForeignKeyDeleteRejected(
            fn () => $parent->forceDelete(),
            'Hard deletion unexpectedly removed a linked parent.',
        );
        $this->assertForeignKeyDeleteRejected(
            fn () => $school->delete(),
            'Hard deletion unexpectedly removed a linked school.',
        );

        $this->assertDatabaseHas('users', ['id' => $parent->id]);
        $this->assertDatabaseHas('schools', ['id' => $school->id]);
        $this->assertDatabaseHas('whatsapp_accounts', ['user_id' => $parent->id]);
        $this->assertDatabaseHas('whatsapp_link_tokens', ['user_id' => $parent->id]);
    }

    public function test_token_expiring_at_the_claim_boundary_is_rejected(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $issued = $this->service()->issueLinkToken($parent);
        WhatsAppLinkToken::query()->where('user_id', $parent->id)->update(['expires_at' => now()]);

        $this->expectDomainFailure(fn () => $this->service()->consumeLinkToken($issued['token'], $this->identity('boundary')));
    }

    public function test_missing_hash_key_fails_closed_without_identity_values_in_the_error(): void
    {
        $parent = $this->user($this->school(), 'parent');
        $issued = $this->service()->issueLinkToken($parent);
        config(['whatsapp.identity_hash_key' => null]);

        try {
            $this->service()->consumeLinkToken($issued['token'], $this->identity('sensitive-bsuid', '0612345678'));
            $this->fail('Missing identity hash configuration was accepted.');
        } catch (RuntimeException $exception) {
            $this->assertSame('WhatsApp identity hashing is not configured.', $exception->getMessage());
            $this->assertStringNotContainsString('sensitive-bsuid', $exception->getMessage());
            $this->assertStringNotContainsString('0612345678', $exception->getMessage());
        }

        $this->assertNull(WhatsAppLinkToken::query()->where('token_hash', hash('sha256', $issued['token']))->value('consumed_at'));
    }

    public function test_empty_and_short_hash_keys_fail_closed_without_leaking_the_key(): void
    {
        foreach (['', 'short-test-key'] as $invalidKey) {
            $parent = $this->user($this->school(uniqid('weak-', true)), 'parent');
            $issued = $this->service()->issueLinkToken($parent);
            config(['whatsapp.identity_hash_key' => $invalidKey]);

            try {
                $this->service()->consumeLinkToken($issued['token'], $this->identity('key-validation', '0612345678'));
                $this->fail('An invalid identity hash key was accepted.');
            } catch (RuntimeException $exception) {
                $this->assertSame('WhatsApp identity hashing is not configured.', $exception->getMessage());
                if ($invalidKey !== '') {
                    $this->assertStringNotContainsString($invalidKey, $exception->getMessage());
                }
            }

            config(['whatsapp.identity_hash_key' => str_repeat('k', 32)]);
        }
    }

    private function school(string $suffix = '', bool $active = true): School
    {
        return School::create([
            'name' => 'WhatsApp Test School '.$suffix,
            'subdomain' => 'whatsapp-test-'.strtolower($suffix ?: 'default').'-'.uniqid(),
            'is_active' => $active,
            'subscription_status' => 'active',
            'max_buses' => 5,
        ]);
    }

    private function user(?School $school, string $role, string $status = 'active'): User
    {
        return User::create([
            'name' => 'Synthetic '.$role,
            'email' => uniqid($role.'-', true).'@example.test',
            'password' => 'SyntheticPassword123!',
            'school_id' => $school?->id,
            'role' => $role,
            'status' => $status,
        ]);
    }

    private function identity(?string $bsuid, ?string $phone = null): WhatsAppIdentity
    {
        return WhatsAppIdentity::fromValues($bsuid, $phone, new PhoneNormalizer);
    }

    private function service(): WhatsAppLinkService
    {
        return app(WhatsAppLinkService::class);
    }

    private function expectDomainFailure(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected the domain operation to fail.');
        } catch (DomainException $exception) {
            $this->assertNotSame('', $exception->getMessage());
        }
    }

    private function assertForeignKeyDeleteRejected(callable $delete, string $failureMessage): void
    {
        try {
            DB::transaction(function () use ($delete): void {
                $delete();
            });
            $this->fail($failureMessage);
        } catch (QueryException $exception) {
            if (DB::getDriverName() === 'pgsql') {
                $this->assertSame('23503', $exception->errorInfo[0] ?? (string) $exception->getCode());
            }
        }
    }
}
