<?php

declare(strict_types=1);

$backend = getenv('BACKEND_DIR');
$email = getenv('BUS_TRACKER_TEST_EMAIL');
if (! $backend || ! $email) {
    throw new RuntimeException('BACKEND_DIR and BUS_TRACKER_TEST_EMAIL are required.');
}
$autoload = $backend.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
$bootstrap = $backend.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php';

require $autoload;
$app = require $bootstrap;
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::where('email', $email)->firstOrFail();

app(App\Services\FirebaseService::class)->deactivateUserMembership(
    (int) $user->school_id,
    (int) $user->id,
    (string) $user->role,
);

echo json_encode([
    'user_id' => (int) $user->id,
    'school_id' => (int) $user->school_id,
    'role' => $user->role,
], JSON_THROW_ON_ERROR).PHP_EOL;
