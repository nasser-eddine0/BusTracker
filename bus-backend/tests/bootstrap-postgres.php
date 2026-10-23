<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;

return static function (Application $app): void {
    $actual = [
        'app_env' => $app->environment(),
        'driver' => $app->make('config')->get('database.default'),
        'host' => $app->make('config')->get('database.connections.pgsql.host'),
        'database' => $app->make('config')->get('database.connections.pgsql.database'),
    ];

    $expected = [
        'app_env' => 'testing',
        'driver' => 'pgsql',
        'host' => 'postgres',
        'database' => 'bus_tracker_ci',
    ];

    if ($actual !== $expected) {
        throw new RuntimeException('PostgreSQL PHPUnit environment mismatch: '.json_encode($actual, JSON_THROW_ON_ERROR));
    }

    fwrite(STDOUT, 'Verified PHPUnit database environment: '.json_encode($actual, JSON_THROW_ON_ERROR).PHP_EOL);
};
