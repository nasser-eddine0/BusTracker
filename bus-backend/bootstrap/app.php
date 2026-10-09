<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\EnsureSchoolActive;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\EnsureSubscriptionActive;
use App\Http\Middleware\ThrottleByRole;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserRole::class,
            'school.active' => EnsureSchoolActive::class,
            'subscription.active' => EnsureSubscriptionActive::class,
            'super_admin' => EnsureSuperAdmin::class,
            'throttle.role' => ThrottleByRole::class,
            'school.owner' => \App\Http\Middleware\EnsureSchoolResourceOwnership::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
