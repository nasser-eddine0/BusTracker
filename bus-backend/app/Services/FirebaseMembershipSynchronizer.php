<?php

namespace App\Services;

use App\Jobs\RetryFirebaseProjection;
use App\Models\FirebaseSyncFailure;
use App\Models\School;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class FirebaseMembershipSynchronizer
{
    public function dispatchDue(int $limit = 100): int
    {
        $dispatched = 0;
        $leaseSeconds = max(120, (int) config('queue.connections.'.config('queue.default').'.retry_after', 90) + 30);

        FirebaseSyncFailure::query()
            ->where('operation', 'membership_sync')
            ->whereNull('completed_at')
            ->whereNull('superseded_at')
            ->whereIn('status', ['pending', 'failed'])
            ->where(fn ($query) => $query->whereNull('next_retry_at')->orWhere('next_retry_at', '<=', now()))
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id')
            ->each(function (int $failureId) use (&$dispatched, $leaseSeconds): void {
                $claimed = DB::transaction(function () use ($failureId, $leaseSeconds): bool {
                    $failure = FirebaseSyncFailure::query()->lockForUpdate()->find($failureId);
                    if (! $failure || $failure->completed_at || $failure->superseded_at
                        || ! in_array($failure->status, ['pending', 'failed'], true)
                        || ($failure->next_retry_at && $failure->next_retry_at->isFuture())) {
                        return false;
                    }

                    $failure->update(['next_retry_at' => now()->addSeconds($leaseSeconds)]);

                    return true;
                });

                if (! $claimed) {
                    return;
                }

                try {
                    RetryFirebaseProjection::dispatch($failureId);
                    $dispatched++;
                } catch (Throwable $exception) {
                    FirebaseSyncFailure::query()->whereKey($failureId)->update([
                        'status' => 'failed',
                        'attempts' => DB::raw('attempts + 1'),
                        'last_attempt_at' => now(),
                        'last_error' => $exception->getMessage(),
                        'next_retry_at' => now()->addMinute(),
                    ]);
                    Log::warning('Firebase membership recovery dispatch failed.', [
                        'sync_id' => $failureId,
                        'error' => $exception->getMessage(),
                    ]);
                }
            });

        return $dispatched;
    }

    public function enqueue(User $user, ?int $schoolId = null, ?bool $desiredActive = null, ?string $role = null): FirebaseSyncFailure
    {
        $schoolId ??= $user->school_id;
        $role ??= $user->role;

        if ($schoolId === null) {
            return $this->completedWithoutProjection($user, $role);
        }

        $desiredActive ??= $this->isEligible($user, $schoolId);
        $membershipKey = "{$schoolId}:{$user->id}";

        $query = FirebaseSyncFailure::query()
            ->where('operation', 'membership_sync')
            ->where('membership_key', $membershipKey)
            ->whereNull('superseded_at')
            ->whereNull('completed_at');

        $query->update([
            'status' => 'failed',
            'superseded_at' => now(),
            'next_retry_at' => null,
        ]);

        $failure = FirebaseSyncFailure::create([
            'operation' => 'membership_sync',
            'context' => [
                'user_id' => (int) $user->id,
                'school_id' => $schoolId,
                'role' => $role,
                'desired_active' => $desiredActive,
            ],
            'user_id' => $user->id,
            'school_id' => $schoolId,
            'desired_active' => $desiredActive,
            'desired_role' => $role,
            'desired_state' => [
                'school_id' => $schoolId,
                'user_id' => (int) $user->id,
                'role' => $role,
                'active' => $desiredActive,
            ],
            'status' => 'pending',
            'membership_key' => $membershipKey,
            'next_retry_at' => now(),
        ]);

        try {
            RetryFirebaseProjection::dispatch($failure->id);
        } catch (Throwable $exception) {
            $failure->update([
                'status' => 'failed',
                'last_error' => $exception->getMessage(),
                'last_attempt_at' => now(),
                'attempts' => $failure->attempts + 1,
                'next_retry_at' => now()->addMinute(),
            ]);
            Log::warning('Firebase membership projection dispatch failed.', [
                'sync_id' => $failure->id,
                'user_id' => $failure->user_id,
                'school_id' => $failure->school_id,
                'error' => $exception->getMessage(),
            ]);
        }

        return $failure;
    }

    public function enqueueForSchool(User $user, int $schoolId, bool $desiredActive, ?string $role = null): FirebaseSyncFailure
    {
        return $this->enqueue($user, $schoolId, $desiredActive, $role);
    }

    private function isEligible(User $user, int $schoolId): bool
    {
        $school = School::query()->find($schoolId);

        return (int) $user->school_id === $schoolId
            && $user->status === 'active'
            && ! $user->trashed()
            && $school?->is_active === true
            && $school->isSubscribed();
    }

    private function completedWithoutProjection(User $user, ?string $role): FirebaseSyncFailure
    {
        return FirebaseSyncFailure::create([
            'operation' => 'membership_sync',
            'context' => ['user_id' => (int) $user->id, 'school_id' => null],
            'user_id' => $user->id,
            'desired_active' => false,
            'desired_role' => $role,
            'desired_state' => ['school_id' => null, 'user_id' => (int) $user->id, 'role' => $role, 'active' => false],
            'status' => 'synced',
            'completed_at' => now(),
            'last_successful_sync_at' => now(),
        ]);
    }
}
