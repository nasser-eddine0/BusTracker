<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'You are not allowed to access this resource.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'This account is disabled.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
