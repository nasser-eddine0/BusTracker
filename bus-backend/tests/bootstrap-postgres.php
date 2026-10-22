<?php

declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';

$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$actual = [
    'app_env' => app()->environment(),
    'driver' => config('database.default'),
    'host' => config('database.connections.pgsql.host'),
    'database' => config('database.connections.pgsql.database'),
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
