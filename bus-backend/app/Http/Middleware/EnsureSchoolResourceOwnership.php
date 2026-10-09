<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSchoolResourceOwnership
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || $user->role === 'super_admin') {
            return $next($request);
        }

        $schoolId = (int) $user->school_id;

        foreach ($request->route()->parameters() as $name => $parameter) {
            if ($parameter instanceof \Illuminate\Database\Eloquent\Model) {
                // If the model has a school_id attribute, verify it matches
                if (isset($parameter->school_id) && (int) $parameter->school_id !== $schoolId) {
                    abort(403, 'Unauthorized school resource access.');
                }
            }
        }

        return $next($request);
    }
}
