<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Jobs\RetryFirebaseProjection;
use App\Models\FirebaseSyncFailure;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FirebaseSyncController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'failed', 'synced'])],
            'user_id' => ['nullable', 'integer'],
            'school_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $syncs = FirebaseSyncFailure::query()
            ->where('operation', 'membership_sync')
            ->whereNull('superseded_at')
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['user_id'] ?? null, fn ($query, $userId) => $query->where('user_id', $userId))
            ->when($validated['school_id'] ?? null, fn ($query, $schoolId) => $query->where('school_id', $schoolId))
            ->latest('id')
            ->paginate($validated['per_page'] ?? 25);

        return response()->json($syncs);
    }

    public function retry(FirebaseSyncFailure $sync, AuditLogger $auditLogger): JsonResponse
    {
        abort_unless($sync->operation === 'membership_sync' && ! $sync->superseded_at, 404);

        $sync->update([
            'status' => 'pending',
            'next_retry_at' => now(),
            'last_error' => null,
        ]);
        RetryFirebaseProjection::dispatch($sync->id);

        $auditLogger->log([
            'action' => 'firebase_membership_sync_retried',
            'severity' => 'warning',
            'description' => 'Super Admin manually retried a Firebase membership synchronization.',
            'school_id' => $sync->school_id,
            'new_values' => [
                'sync_id' => $sync->id,
                'user_id' => $sync->user_id,
                'school_id' => $sync->school_id,
            ],
        ]);

        return response()->json([
            'message' => 'Firebase membership synchronization queued.',
            'sync' => $sync->fresh(),
        ], 202);
    }
}
