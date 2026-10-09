<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SchoolController extends Controller
{
    public function index(): JsonResponse
    {
        $schools = School::query()
            ->withCount([
                'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
            ])
            ->latest()
            ->get();

        return response()->json([
            'schools' => $schools,
        ]);
    }

    public function store(Request $request, AuditLogger $auditLogger): JsonResponse
    {
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
            'school' => $school->loadCount([
                'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
            ]),
        ], 201);
    }

    public function update(Request $request, School $school, AuditLogger $auditLogger): JsonResponse
    {
        $before = $school->only(['name', 'subdomain', 'logo_path', 'primary_color', 'max_buses', 'is_active']);
        $school->update($this->validatedData($request, $school));
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
            'school' => $school->refresh()->loadCount([
                'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
            ]),
        ]);
    }

    public function toggleStatus(Request $request, School $school, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['nullable', 'boolean'],
        ]);

        $previousStatus = (bool) $school->is_active;
        $school->update([
            'is_active' => array_key_exists('is_active', $validated)
                ? $validated['is_active']
                : !$school->is_active,
        ]);
        $school->refresh();

        $auditLogger->log([
            'action' => $school->is_active ? 'school_activated' : 'school_suspended',
            'description' => "School '{$school->name}' ".($school->is_active ? 'activated' : 'suspended').' by Super Admin',
            'severity' => $school->is_active ? 'info' : 'warning',
            'auditable' => $school,
            'school_id' => $school->id,
            'old_values' => ['is_active' => $previousStatus],
            'new_values' => ['is_active' => (bool) $school->is_active],
        ]);

        return response()->json([
            'message' => $school->is_active ? 'School activated successfully.' : 'School deactivated successfully.',
            'school' => $school->loadCount([
                'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
            ]),
        ]);
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
            'school' => $school->refresh()->loadCount([
                'users as admin_count' => fn ($query) => $query->where('role', 'admin'),
            ]),
        ], 201);
    }

    public function updateAdmin(Request $request, User $user): JsonResponse
    {
        if ($user->role !== 'admin') {
            return response()->json([
                'message' => 'Only admin accounts can be managed here.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['nullable', 'string', 'min:8'],
            'school_id' => ['nullable', 'integer', Rule::exists('schools', 'id')],
            'role' => ['sometimes', Rule::in(['admin', 'super_admin'])],
            'status' => ['required', Rule::in(['active', 'disabled'])],
        ]);

        $user->fill([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'phone' => $validated['phone'] ?? null,
            'school_id' => $validated['school_id'] ?? $user->school_id,
            'role' => $validated['role'] ?? $user->role,
            'status' => $validated['status'],
        ]);

        if (!empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

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
