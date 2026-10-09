<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSchoolActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Temp debug
        \Illuminate\Support\Facades\Log::info('EnsureSchoolActive', [
            'user_id' => $user?->id,
            'role' => $user?->role,
            'school_id' => $user?->school_id,
            'school_id_type' => gettype($user?->school_id),
            'is_null' => $user?->school_id === null,
        ]);

        if ($user?->role === 'parent' && $user->school_id === null) {
            return $next($request);
        }

        if (!$user?->school || !$user->school->is_active) {
            return response()->json([
                'message' => 'This school is deactivated or suspended.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
