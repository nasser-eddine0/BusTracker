<?php

declare(strict_types=1);

$database = getenv('DB_DATABASE') ?: '';
$temp = realpath(sys_get_temp_dir());
$resolvedDatabase = realpath($database) ?: $database;
if (strtolower((string) getenv('DB_CONNECTION')) !== 'sqlite'
    || ! $temp
    || ! str_starts_with(strtolower(str_replace('\\', '/', $resolvedDatabase)), strtolower(str_replace('\\', '/', $temp)))) {
    throw new RuntimeException('Synthetic admin fixture requires SQLite under the system temp directory.');
}

$email = getenv('BUS_TRACKER_TEST_EMAIL');
$password = getenv('BUS_TRACKER_TEST_PASSWORD');
$backend = getenv('BACKEND_DIR');
if (! $email || ! $password || ! $backend) {
    throw new RuntimeException('BUS_TRACKER_TEST_EMAIL, BUS_TRACKER_TEST_PASSWORD and BACKEND_DIR are required.');
}

require $backend.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
$app = require $backend.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::updateOrCreate(
    ['email' => strtolower($email)],
    [
        'name' => 'Synthetic School Admin',
        'password' => $password,
        'role' => 'admin',
        'status' => 'active',
        'school_id' => (int) (getenv('BUS_TRACKER_TEST_SCHOOL_ID') ?: 1),
    ],
);

echo json_encode([
    'id' => (int) $user->id,
    'email' => $user->email,
    'role' => $user->role,
    'status' => $user->status,
    'school_id' => $user->school_id,
], JSON_THROW_ON_ERROR).PHP_EOL;
