<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->role === 'parent' && $user->school_id === null) {
            return $next($request);
        }

        $school = $user?->school;

        if (!$school || (!$school->isSubscribed() && !$school->isOnTrial() && !$school->isOnGracePeriod())) {
            return response()->json([
                'message' => 'Your school subscription is inactive or expired. Please update billing to continue.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
