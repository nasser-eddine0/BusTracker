<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Jobs\RetryFirebaseProjection;
use App\Models\FirebaseSyncFailure;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\FirebaseMembershipSynchronizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SchoolController extends Controller
{
    public function index(): JsonResponse
    {
        $schools = School::query()
            ->withCount([
                'users as user_count',
                'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
                'students as student_count',
                'buses as bus_count',
            ])
            ->latest()
            ->get()
            ->map(fn (School $school) => $this->schoolSummary($school));

        return response()->json([
            'schools' => $schools,
        ]);
    }

    public function store(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        return DB::transaction(function () use ($request, $auditLogger) {
            $school = School::create($this->validatedData($request));

            $auditLogger->log([
                'action' => 'school_created',
                'description' => "School '{$school->name}' created by Super Admin",
                'auditable' => $school,
                'school_id' => $school->id,
                'new_values' => $school->only(['id', 'name', 'subdomain', 'max_buses', 'is_active']),
            ]);

            return response()->json([
                'message' => 'School created successfully.',
                'school' => $this->schoolSummary($school),
            ], 201);
        });
    }

    public function update(Request $request, School $school, AuditLogger $auditLogger): JsonResponse
    {
        return DB::transaction(function () use ($request, $school, $auditLogger) {
            $school = School::query()->lockForUpdate()->findOrFail($school->id);
            $before = $school->only(['name', 'subdomain', 'logo_path', 'primary_color', 'max_buses', 'is_active']);
            $validated = $this->validatedData($request, $school);
            if (array_key_exists('is_active', $validated) && ! $validated['is_active']) {
                $this->queueFirebaseProjection('school_memberships_revoked', ['school_id' => $school->id]);
            } elseif (array_key_exists('is_active', $validated) && $validated['is_active']) {
                $this->queueFirebaseProjection('school_memberships_resync', ['school_id' => $school->id]);
            }
            $school->update($validated);
            $after = $school->fresh()->only(['name', 'subdomain', 'logo_path', 'primary_color', 'max_buses', 'is_active']);

            $auditLogger->log([
                'action' => 'school_updated',
                'description' => "School '{$school->name}' updated by Super Admin",
                'auditable' => $school,
                'school_id' => $school->id,
                'old_values' => $before,
                'new_values' => $after,
            ]);

            return response()->json([
                'message' => 'School updated successfully.',
                'school' => $this->schoolSummary($school->refresh()),
            ]);
        });
    }

    public function toggleStatus(Request $request, School $school, AuditLogger $auditLogger): JsonResponse
    {
        return DB::transaction(function () use ($request, $school, $auditLogger) {
            $school = School::query()->lockForUpdate()->findOrFail($school->id);
            $validated = $request->validate([
                'is_active' => ['required', 'boolean'],
            ]);

            $previousStatus = (bool) $school->is_active;
            if (! $validated['is_active'] && $previousStatus) {
                $this->queueFirebaseProjection('school_memberships_revoked', ['school_id' => $school->id]);
            } elseif ($validated['is_active'] && ! $previousStatus) {
                $this->queueFirebaseProjection('school_memberships_resync', ['school_id' => $school->id]);
            }
            $school->update([
                'is_active' => $validated['is_active'],
            ]);
            $school->refresh();

            if ($previousStatus !== (bool) $school->is_active) {
                $auditLogger->log([
                    'action' => $school->is_active ? 'school_activated' : 'school_suspended',
                    'description' => "School '{$school->name}' ".($school->is_active ? 'activated' : 'suspended').' by Super Admin',
                    'severity' => $school->is_active ? 'info' : 'warning',
                    'auditable' => $school,
                    'school_id' => $school->id,
                    'old_values' => ['is_active' => $previousStatus],
                    'new_values' => ['is_active' => (bool) $school->is_active],
                ]);
            }

            return response()->json([
                'message' => $school->is_active ? 'School activated successfully.' : 'School deactivated successfully.',
                'school' => $this->schoolSummary($school),
            ]);
        });
    }

    public function indexAdmins(): JsonResponse
    {
        $admins = User::query()
            ->where('role', 'admin')
            ->with('school:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'school_id' => $user->school_id ? (string) $user->school_id : null,
                'school' => $user->school ? [
                    'id' => (string) $user->school->id,
                    'name' => $user->school->name,
                ] : null,
            ])
            ->values();

        return response()->json([
            'admins' => $admins,
        ]);
    }

    public function storeAdmin(Request $request, School $school, AuditLogger $auditLogger): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        return DB::transaction(function () use ($request, $school, $auditLogger) {
            $validated = $request->validate([
                'school_id' => ['required', 'integer', Rule::in([$school->id])],
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
                'password' => ['required', 'string', 'min:8'],
                'phone' => ['nullable', 'string', 'max:40'],
            ]);

            $admin = User::create([
                'name' => $validated['name'],
                'email' => strtolower($validated['email']),
                'password' => $validated['password'],
                'phone' => $validated['phone'] ?? null,
                'school_id' => $school->id,
                'role' => 'admin',
                'status' => 'active',
            ]);

            $auditLogger->log([
                'action' => 'school_admin_created',
                'description' => "Admin '{$admin->email}' created for school '{$school->name}' by Super Admin",
                'auditable' => $admin,
                'school_id' => $school->id,
                'new_values' => [
                    'admin_id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'role' => $admin->role,
                    'school_id' => $admin->school_id,
                ],
            ]);

            return response()->json([
                'message' => 'School admin account created successfully.',
                'admin' => [
                    'id' => (string) $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'role' => $admin->role,
                    'school_id' => (string) $admin->school_id,
                ],
                'school' => $this->schoolSummary($school->refresh()),
            ], 201);
        });
    }

    public function updateAdmin(Request $request, User $user, AuditLogger $auditLogger): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        return DB::transaction(function () use ($request, $user, $auditLogger) {
            if ($user->school_id) {
                School::query()->lockForUpdate()->findOrFail($user->school_id);
            }
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
                'phone' => ['nullable', 'string', 'max:40'],
                'password' => ['nullable', 'string', 'min:8'],
                'school_id' => ['sometimes', 'nullable', 'integer', Rule::exists('schools', 'id')],
                'role' => ['sometimes', Rule::in(['admin', 'super_admin'])],
                'status' => ['required', Rule::in(['active', 'disabled'])],
            ]);

            $before = $user->only(['name', 'email', 'phone', 'school_id', 'role', 'status']);
            $oldMembership = clone $user;
            $nextRole = $validated['role'] ?? $user->role;
            $nextSchoolId = array_key_exists('school_id', $validated) ? $validated['school_id'] : $user->school_id;

            if ($nextRole === 'super_admin') {
                $nextSchoolId = null;
            } elseif ($nextSchoolId === null) {
                return $this->rejectSuperAdminChange(
                    $user,
                    $auditLogger,
                    'School administrators must belong to a school.',
                    ['role' => $nextRole, 'school_id' => null, 'status' => $validated['status']],
                );
            }

            $selfRemoval = $user->id === $request->user()->id
                && ($nextRole !== 'super_admin' || $validated['status'] !== 'active');
            $lastSuperAdmin = $user->role === 'super_admin'
                && $user->status === 'active'
                && ($nextRole !== 'super_admin' || $validated['status'] !== 'active')
                && User::query()->where('role', 'super_admin')->where('status', 'active')->count() <= 1;

            if ($selfRemoval || $lastSuperAdmin) {
                return $this->rejectSuperAdminChange(
                    $user,
                    $auditLogger,
                    $selfRemoval
                        ? 'You cannot disable or demote your current Super Admin account.'
                        : 'The last active Super Admin cannot be disabled or demoted.',
                    ['role' => $nextRole, 'school_id' => $nextSchoolId, 'status' => $validated['status']],
                );
            }

            $user->fill([
                'name' => $validated['name'],
                'email' => strtolower($validated['email']),
                'phone' => $validated['phone'] ?? null,
                'school_id' => $nextSchoolId,
                'role' => $nextRole,
                'status' => $validated['status'],
            ]);

            if (! empty($validated['password'])) {
                $user->password = $validated['password'];
            }

            $membershipChanged = $user->isDirty(['school_id', 'role', 'status']);
            $credentialsChanged = $user->isDirty(['password', 'email']);
            if ($membershipChanged && $oldMembership->school_id) {
                app(FirebaseMembershipSynchronizer::class)->enqueueForSchool(
                    $oldMembership,
                    (int) $oldMembership->school_id,
                    false,
                    $oldMembership->role,
                );
            }
            $user->save();
            $accessChanged = $membershipChanged || $credentialsChanged;
            if ($accessChanged) {
                $user->tokens()->delete();
            }
            if ($membershipChanged && $user->school_id && $user->status === 'active') {
                app(FirebaseMembershipSynchronizer::class)->enqueue($user);
            }
            $auditLogger->log([
                'action' => $user->role !== $before['role']
                    ? 'school_admin_role_changed'
                    : ($user->status !== $before['status']
                        ? ($user->status === 'active' ? 'school_admin_reactivated' : 'school_admin_disabled')
                        : 'school_admin_updated'),
                'severity' => $accessChanged ? 'warning' : 'info',
                'description' => 'Super admin updated a school administrator.', 'auditable' => $user,
                'school_id' => $user->school_id, 'old_values' => $before,
                'new_values' => $user->only(['name', 'email', 'phone', 'school_id', 'role', 'status']),
            ]);
            $user->unsetRelation('school');

            return response()->json([
                'message' => 'Admin updated successfully.',
                'admin' => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'status' => $user->status,
                    'school_id' => $user->school_id ? (string) $user->school_id : null,
                    'school' => $user->school ? [
                        'id' => (string) $user->school->id,
                        'name' => $user->school->name,
                    ] : null,
                ],
            ]);
        });
    }

    public function destroyAdmin(User $user, AuditLogger $auditLogger): JsonResponse
    {
        return DB::transaction(function () use ($user, $auditLogger) {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $schoolId = $user->school_id;
            $isLastActiveSuperAdmin = $user->role === 'super_admin'
                && $user->status === 'active'
                && User::query()->where('role', 'super_admin')->where('status', 'active')->count() <= 1;

            if ($user->id === request()->user()->id || $isLastActiveSuperAdmin) {
                return $this->rejectSuperAdminChange(
                    $user,
                    $auditLogger,
                    $user->id === request()->user()->id
                        ? 'You cannot delete your current Super Admin account.'
                        : 'The last active Super Admin cannot be deleted.',
                    ['deleted' => true],
                );
            }

            if ($schoolId) {
                app(FirebaseMembershipSynchronizer::class)->enqueueForSchool($user, (int) $schoolId, false, $user->role);
            } else {
                app(FirebaseMembershipSynchronizer::class)->enqueue($user, null, false, $user->role);
            }
            $user->tokens()->delete();
            $user->delete();

            $auditLogger->log([
                'action' => 'school_admin_deleted',
                'severity' => 'warning',
                'description' => 'Super admin deleted an administrator account.',
                'school_id' => $schoolId,
                'old_values' => [
                    'id' => $user->id, 'email' => $user->email, 'role' => $user->role,
                    'school_id' => $schoolId, 'status' => $user->status,
                ],
            ]);

            return response()->json(['message' => 'Administrator deleted successfully.']);
        });
    }

    private function queueFirebaseProjection(string $operation, array $context): void
    {
        if (in_array($operation, ['school_memberships_revoked', 'school_memberships_resync'], true)
            && isset($context['school_id'])) {
            $desiredActive = $operation === 'school_memberships_resync';
            User::withoutGlobalScope('school')
                ->where('school_id', (int) $context['school_id'])
                ->whereIn('role', ['admin', 'driver', 'parent'])
                ->get()
                ->each(fn (User $user) => app(FirebaseMembershipSynchronizer::class)->enqueueForSchool(
                    $user,
                    (int) $context['school_id'],
                    $desiredActive,
                    $user->role,
                ));

            return;
        }

        $failure = FirebaseSyncFailure::create([
            'operation' => $operation,
            'context' => $context,
            'school_id' => $context['school_id'] ?? null,
            'status' => 'pending',
            'next_retry_at' => now(),
        ]);

        RetryFirebaseProjection::dispatch($failure->id);
    }

    private function schoolSummary(School $school): School
    {
        $school->loadCount([
            'users as user_count',
            'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
            'students as student_count',
            'buses as bus_count',
        ]);

        $latest = FirebaseSyncFailure::query()
            ->where('operation', 'membership_sync')
            ->where('school_id', $school->id)
            ->whereNull('superseded_at')
            ->latest('id')
            ->get(['id', 'membership_key', 'status'])
            ->unique(fn (FirebaseSyncFailure $sync) => $sync->membership_key ?: 'row:'.$sync->id);
        $counts = [
            'pending' => $latest->where('status', 'pending')->count(),
            'failed' => $latest->where('status', 'failed')->count(),
            'synced' => $latest->where('status', 'synced')->count(),
        ];

        $school->setAttribute('firebase_sync', [
            ...$counts,
            'total' => array_sum($counts),
            'status' => $counts['failed'] > 0 ? 'failed' : ($counts['pending'] > 0 ? 'pending' : ($counts['synced'] > 0 ? 'synced' : 'not_tracked')),
        ]);

        return $school;
    }

    private function rejectSuperAdminChange(
        User $user,
        AuditLogger $auditLogger,
        string $message,
        array $requestedValues,
    ): JsonResponse {
        $auditLogger->log([
            'action' => 'super_admin_change_rejected',
            'severity' => 'warning',
            'description' => $message,
            'auditable' => $user,
            'school_id' => $user->school_id,
            'old_values' => $user->only(['id', 'role', 'status', 'school_id']),
            'new_values' => $requestedValues,
        ]);

        return response()->json(['message' => $message], 422);
    }

    private function validatedData(Request $request, ?School $school = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required',
                'string',
                'max:80',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('schools', 'subdomain')->ignore($school),
            ],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'primary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'max_buses' => ['required', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
