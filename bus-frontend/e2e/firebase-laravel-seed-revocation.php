<?php

declare(strict_types=1);

$backend = getenv('BACKEND_DIR') ?: '';
$database = getenv('DB_DATABASE') ?: '';
$tempDirectory = realpath(sys_get_temp_dir());
$resolvedDatabase = realpath($database) ?: $database;
$normalizedDatabase = strtolower(str_replace('\\', '/', $resolvedDatabase));
$normalizedTemp = $tempDirectory
    ? rtrim(strtolower(str_replace('\\', '/', $tempDirectory)), '/').'/'
    : '';

$required = [
    'BUS_TRACKER_TEST_EMAIL' => getenv('BUS_TRACKER_TEST_EMAIL'),
    'BUS_TRACKER_TEST_PASSWORD' => getenv('BUS_TRACKER_TEST_PASSWORD'),
    'SUPER_ADMIN_EMAIL' => getenv('SUPER_ADMIN_EMAIL'),
    'SUPER_ADMIN_PASSWORD' => getenv('SUPER_ADMIN_PASSWORD'),
];

if ($backend === '' || ! is_dir($backend)) {
    throw new RuntimeException('BACKEND_DIR must point to the Laravel backend.');
}

if (getenv('APP_ENV') !== 'testing'
    || strtolower((string) getenv('DB_CONNECTION')) !== 'sqlite'
    || $normalizedTemp === ''
    || ! str_starts_with($normalizedDatabase, $normalizedTemp)
    || ! is_file($resolvedDatabase)
    || getenv('FIREBASE_MODE_A_CONFIRM') !== 'I_UNDERSTAND_EMULATOR_TEST') {
    throw new RuntimeException('Mode-A fixture requires APP_ENV=testing, temporary SQLite, an existing database file, and FIREBASE_MODE_A_CONFIRM=I_UNDERSTAND_EMULATOR_TEST.');
}

foreach ($required as $name => $value) {
    if (! is_string($value) || trim($value) === '') {
        throw new RuntimeException($name.' is required.');
    }
}

require $backend.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
$app = require $backend.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

if (config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== $database
    || app('env') !== 'testing') {
    throw new RuntimeException('Laravel did not bootstrap with the requested temporary SQLite testing configuration.');
}

$school = App\Models\School::updateOrCreate(
    ['subdomain' => 'phase19k-emulator-school'],
    [
        'name' => 'Phase 19k Emulator School',
        'is_active' => true,
        'subscription_status' => 'active',
    ],
);

$parent = App\Models\User::updateOrCreate(
    ['email' => strtolower(trim((string) $required['BUS_TRACKER_TEST_EMAIL']))],
    [
        'name' => 'Phase 19k Synthetic Parent',
        'password' => Illuminate\Support\Facades\Hash::make((string) $required['BUS_TRACKER_TEST_PASSWORD']),
        'school_id' => $school->id,
        'role' => 'parent',
        'status' => 'active',
    ],
);

$superAdmin = App\Models\User::updateOrCreate(
    ['email' => strtolower(trim((string) $required['SUPER_ADMIN_EMAIL']))],
    [
        'name' => 'Phase 19k Synthetic Super Admin',
        'password' => Illuminate\Support\Facades\Hash::make((string) $required['SUPER_ADMIN_PASSWORD']),
        'school_id' => null,
        'role' => 'super_admin',
        'status' => 'active',
    ],
);

fwrite(STDOUT, json_encode([
    'status' => 'SEEDED',
    'db_driver' => config('database.default'),
    'db_path' => $database,
    'school_id' => (int) $school->id,
    'school_active' => (bool) $school->is_active,
    'parent_id' => (int) $parent->id,
    'parent_role' => $parent->role,
    'parent_status' => $parent->status,
    'super_admin_id' => (int) $superAdmin->id,
    'super_admin_role' => $superAdmin->role,
    'super_admin_status' => $superAdmin->status,
], JSON_THROW_ON_ERROR).PHP_EOL);
