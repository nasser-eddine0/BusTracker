<?php

declare(strict_types=1);

$database = getenv('DB_DATABASE') ?: '';
$temp = realpath(sys_get_temp_dir());
$resolved = realpath($database) ?: $database;
if (strtolower((string) getenv('DB_CONNECTION')) !== 'sqlite'
    || ! $temp
    || ! str_starts_with(strtolower(str_replace('\\', '/', $resolved)), strtolower(str_replace('\\', '/', $temp)))) {
    throw new RuntimeException('Transfer fixture requires SQLite under the system temp directory.');
}
$backend = getenv('BACKEND_DIR');
$email = getenv('BUS_TRACKER_TEST_EMAIL');
$password = getenv('BUS_TRACKER_TEST_PASSWORD');
if (! $backend || ! $email || ! $password) throw new RuntimeException('BACKEND_DIR and admin credentials are required.');
require $backend.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
$app = require $backend.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$old = App\Models\School::firstOrCreate(['id' => 1], [
    'name' => 'Synthetic School A', 'subdomain' => 'synthetic-school-a', 'max_buses' => 5,
    'is_active' => true, 'subscription_status' => 'active',
]);
$new = App\Models\School::firstOrCreate(['id' => 2], [
    'name' => 'Synthetic School B', 'subdomain' => 'synthetic-school-b', 'max_buses' => 5,
    'is_active' => true, 'subscription_status' => 'active',
]);
$admin = App\Models\User::updateOrCreate(['email' => strtolower($email)], [
    'name' => 'Synthetic School Admin', 'password' => $password, 'role' => 'admin',
    'status' => 'active', 'school_id' => $old->id,
]);
echo json_encode(['old_school_id' => $old->id, 'new_school_id' => $new->id, 'admin_id' => $admin->id], JSON_THROW_ON_ERROR).PHP_EOL;
