<?php

use App\Http\Middleware\EnsureSchoolActive;
use App\Http\Middleware\EnsureSchoolResourceOwnership;
use App\Http\Middleware\EnsureSubscriptionActive;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\ThrottleByRole;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->useCache(env('SCHEDULE_CACHE_STORE', 'file'));
        $schedule->command('firebase:dispatch-membership-syncs --limit=100')
            ->everyMinute()
            ->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserRole::class,
            'school.active' => EnsureSchoolActive::class,
            'subscription.active' => EnsureSubscriptionActive::class,
            'super_admin' => EnsureSuperAdmin::class,
            'throttle.role' => ThrottleByRole::class,
            'school.owner' => EnsureSchoolResourceOwnership::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
