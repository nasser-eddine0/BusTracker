<?php

namespace App\Jobs;

use App\Models\FirebaseSyncFailure;
use App\Models\School;
use App\Models\Trip;
use App\Models\User;
use App\Services\FirebaseService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class RetryFirebaseProjection implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(public int $failureId)
    {
        $this->afterCommit();
    }

    public function backoff(): array
    {
        return [60, 300, 900, 1800];
    }

    public function handle($firebase = null): void
    {
        $failure = FirebaseSyncFailure::query()->find($this->failureId);

        if (! $failure || $failure->completed_at || $failure->superseded_at) {
            return;
        }

        $failure->update([
            'attempts' => $failure->attempts + 1,
            'last_attempt_at' => now(),
            'status' => 'pending',
        ]);

        try {
            $firebase ??= app(FirebaseService::class);
            $this->retryOperation($failure, $firebase);
            $failure->update([
                'status' => 'synced',
                'completed_at' => now(),
                'last_successful_sync_at' => now(),
                'next_retry_at' => null,
                'last_error' => null,
            ]);

            $this->logTestingDiagnostic($failure, $firebase, 'synced', null);
        } catch (\Throwable $exception) {
            $failure->update([
                'status' => 'failed',
                'last_error' => $exception->getMessage(),
                'next_retry_at' => now()->addSeconds($this->retryDelay($failure->attempts)),
            ]);

            $this->logTestingDiagnostic($failure, $firebase ?? null, 'failed', $exception->getMessage());

            if (config('queue.default') === 'sync') {
                return;
            }

            throw $exception;
        }
    }

    private function logTestingDiagnostic(FirebaseSyncFailure $failure, mixed $firebase, string $status, ?string $lastError): void
    {
        if (! app()->environment('testing') || ! is_object($firebase) || get_class($firebase) !== FirebaseService::class) {
            return;
        }

        $diagnostic = $firebase->membershipProjectionDiagnostic();
        if ($diagnostic === null) {
            return;
        }

        $safeError = $lastError === null ? null : preg_replace(
            '/(authorization|token|password|private[_ ]key|secret)\s*[:=]\s*[^\s,;]+/i',
            '$1=[redacted]',
            substr($lastError, 0, 500),
        );

        Log::info('Firebase membership projection diagnostic', array_merge($diagnostic, [
            'sync_id' => (int) $failure->id,
            'sync_status' => $status,
            'sync_attempts' => (int) $failure->attempts,
            'sync_last_error' => $safeError,
        ]));
    }

    private function retryOperation(FirebaseSyncFailure $failure, FirebaseService $firebase): void
    {
        $context = $failure->context ?? [];

        match ($failure->operation) {
            'trip_started' => $this->retryTripStarted($context, $firebase),
            'trip_stale_completed', 'trip_finalized' => $this->retryTripCompleted($context, $firebase),
            'trip_location_updated' => $this->retryTripLocation($context, $firebase),
            'student_status_updated', 'parent_ready_declared', 'parent_absence_declared' => $this->retryTripAttendance($context, $firebase),
            'school_memberships_revoked' => $firebase->revokeSchoolMemberships((int) $context['school_id']),
            'school_memberships_resync' => $this->retrySchoolMemberships($context, $firebase),
            'user_membership_revoked' => $this->retryUserMembershipRevocation($context, $firebase),
            'user_membership_synced' => $this->retryUserMembershipSync($context, $firebase),
            'membership_sync' => $this->retryMembershipSync($failure, $firebase),
            default => null,
        };
    }

    private function retryMembershipSync(FirebaseSyncFailure $failure, FirebaseService $firebase): void
    {
        $state = $failure->desired_state ?? $failure->context ?? [];
        $userId = (int) ($state['user_id'] ?? $failure->user_id);
        $schoolId = (int) ($state['school_id'] ?? $failure->school_id);
        $desiredActive = (bool) ($state['active'] ?? $failure->desired_active);

        if (! $userId || ! $schoolId) {
            return;
        }

        $user = User::withoutGlobalScope('school')->withTrashed()->find($userId);
        $currentSchool = $user?->school_id;
        $currentActive = $user
            && $currentSchool !== null
            && (int) $currentSchool === $schoolId
            && $user->status === 'active'
            && ! $user->trashed()
            && School::query()->find($schoolId)?->is_active === true
            && School::query()->find($schoolId)?->isSubscribed();

        if ($desiredActive && $currentActive) {
            $firebase->syncUserMembership($user);

            return;
        }

        $firebase->deactivateUserMembership(
            $schoolId,
            $userId,
            (string) ($state['role'] ?? $failure->desired_role ?? $user?->role ?? 'admin'),
        );
    }

    private function retryDelay(int $attempt): int
    {
        return match (true) {
            $attempt <= 1 => 60,
            $attempt === 2 => 300,
            $attempt === 3 => 900,
            default => 1800,
        };
    }

    private function retryTripStarted(array $context, FirebaseService $firebase): void
    {
        $trip = $this->activeTripFromContext($context);

        if ($trip) {
            $firebase->projectTripStarted($trip);
        }
    }

    private function retryTripCompleted(array $context, FirebaseService $firebase): void
    {
        if (! isset($context['bus_id'], $context['trip_id'], $context['school_id'])) {
            return;
        }

        $firebase->completeTrip((int) $context['bus_id'], (int) $context['trip_id'], (int) $context['school_id']);
    }

    private function retryTripLocation(array $context, FirebaseService $firebase): void
    {
        $trip = $this->activeTripFromContext($context);

        if (! $trip || ! isset($context['latitude'], $context['longitude'])) {
            return;
        }

        $firebase->updateTripLocation($trip, (float) $context['latitude'], (float) $context['longitude']);
    }

    private function retryTripAttendance(array $context, FirebaseService $firebase): void
    {
        $trip = $this->activeTripFromContext($context);

        if (! $trip || ! isset($context['student_id'], $context['status'])) {
            return;
        }

        $firebase->updateTripAttendance($trip, (int) $context['student_id'], (string) $context['status']);
    }

    private function retrySchoolMemberships(array $context, FirebaseService $firebase): void
    {
        if (! isset($context['school_id'])) {
            return;
        }

        User::withoutGlobalScope('school')
            ->where('school_id', (int) $context['school_id'])
            ->whereIn('role', ['admin', 'driver', 'parent'])
            ->get()
            ->each(fn (User $user) => $firebase->syncUserMembership($user));
    }

    private function retryUserMembershipRevocation(array $context, FirebaseService $firebase): void
    {
        if (! isset($context['user_id'], $context['school_id'])) {
            return;
        }

        $user = User::withoutGlobalScope('school')->withTrashed()->find((int) $context['user_id']);
        if ($user && (int) $user->school_id === (int) $context['school_id'] && $user->status === 'active' && ! $user->trashed()) {
            $firebase->syncUserMembership($user);

            return;
        }

        $firebase->deactivateUserMembership(
            (int) $context['school_id'],
            (int) $context['user_id'],
            (string) ($context['role'] ?? 'admin'),
        );
    }

    private function retryUserMembershipSync(array $context, FirebaseService $firebase): void
    {
        if (! isset($context['user_id'])) {
            return;
        }

        $user = User::withoutGlobalScope('school')->withTrashed()->find((int) $context['user_id']);
        if ($user) {
            $firebase->syncUserMembership($user);
        }
    }

    private function activeTripFromContext(array $context): ?Trip
    {
        if (! isset($context['trip_id'], $context['school_id'])) {
            return null;
        }

        return Trip::query()
            ->where('school_id', (int) $context['school_id'])
            ->where('id', (int) $context['trip_id'])
            ->where('status', 'in_progress')
            ->first();
    }
}
