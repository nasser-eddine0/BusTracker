<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AccountController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['account' => $request->user()->fresh()->only(['name', 'email', 'phone'])]);
    }

    public function update(Request $request, AuditLogger $audit): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($request->user()->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'current_password' => ['required', 'current_password:sanctum'],
        ]);

        return DB::transaction(function () use ($request, $validated, $audit) {
            $user = $request->user()->newQuery()->lockForUpdate()->findOrFail($request->user()->id);
            if (! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages(['current_password' => 'The current password is incorrect.']);
            }
            $before = $user->only(['name', 'email', 'phone']);
            $user->fill(collect($validated)->only(['name', 'email', 'phone'])->all());
            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }
            $user->save();
            $audit->log([
                'action' => 'super_admin_profile_updated', 'description' => 'Super admin updated their account profile.',
                'auditable' => $user, 'old_values' => $before, 'new_values' => $user->only(['name', 'email', 'phone']),
            ]);

            return response()->json(['message' => 'Account saved.', 'account' => $user->only(['name', 'email', 'phone'])]);
        });
    }

    public function password(Request $request, AuditLogger $audit): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        return DB::transaction(function () use ($request, $validated, $audit) {
            $user = $request->user()->newQuery()->lockForUpdate()->findOrFail($request->user()->id);
            if (! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages(['current_password' => 'The current password is incorrect.']);
            }
            $user->update(['password' => $validated['password']]);
            $current = $request->user()->currentAccessToken();
            $user->tokens()->when($current instanceof PersonalAccessToken, fn ($query) => $query->where('id', '!=', $current->id))->delete();
            $audit->log([
                'action' => 'super_admin_password_changed', 'severity' => 'warning',
                'description' => 'Super admin changed their password and revoked other API sessions.', 'auditable' => $user,
            ]);

            return response()->json(['message' => 'Password changed. Other API sessions were revoked.']);
        });
    }

    public function sessions(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken();
        $sessions = $request->user()->tokens()->orderByDesc('id')->get()->map(fn ($token) => [
            'id' => (string) $token->id, 'name' => $token->name,
            'created_at' => $token->created_at, 'last_used_at' => $token->last_used_at,
            'expires_at' => $token->expires_at,
            'current' => $current instanceof PersonalAccessToken && $current->id === $token->id,
        ]);

        return response()->json(['sessions' => $sessions]);
    }

    public function revoke(Request $request, string $session, AuditLogger $audit): JsonResponse
    {
        return DB::transaction(function () use ($request, $session, $audit) {
            $token = $request->user()->tokens()->lockForUpdate()->findOrFail($session);
            $current = $request->user()->currentAccessToken();
            abort_if($current instanceof PersonalAccessToken && $current->id === $token->id, 422, 'Use sign out to end your current session.');
            $token->delete();
            $audit->log([
                'action' => 'super_admin_session_revoked', 'severity' => 'warning',
                'description' => 'Super admin revoked an API session.', 'new_values' => ['session_id' => (string) $token->id],
            ]);

            return response()->json(['message' => 'Session revoked.']);
        });
    }
}
