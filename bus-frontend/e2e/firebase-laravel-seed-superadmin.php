<?php

declare(strict_types=1);

$database = getenv('DB_DATABASE') ?: '';
$temp = realpath(sys_get_temp_dir());
$resolvedDatabase = realpath($database) ?: $database;

if (strtolower((string) getenv('DB_CONNECTION')) !== 'sqlite'
    || ! $temp
    || ! str_starts_with(strtolower(str_replace('\\', '/', $resolvedDatabase)), strtolower(str_replace('\\', '/', $temp)))) {
    throw new RuntimeException('Synthetic Super Admin fixture requires SQLite under the system temp directory.');
}

$email = getenv('SUPER_ADMIN_EMAIL');
$password = getenv('SUPER_ADMIN_PASSWORD');
if (! $email || ! $password) {
    throw new RuntimeException('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.');
}

$backend = getenv('BACKEND_DIR');
if (! $backend) {
    throw new RuntimeException('BACKEND_DIR is required.');
}

require $backend.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
$app = require $backend.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::updateOrCreate(
    ['email' => strtolower($email)],
    [
        'name' => 'Synthetic Super Admin',
        'password' => $password,
        'role' => 'super_admin',
        'status' => 'active',
        'school_id' => null,
    ],
);

echo json_encode([
    'id' => (int) $user->id,
    'email' => $user->email,
    'role' => $user->role,
    'status' => $user->status,
    'school_id' => $user->school_id,
], JSON_THROW_ON_ERROR).PHP_EOL;
