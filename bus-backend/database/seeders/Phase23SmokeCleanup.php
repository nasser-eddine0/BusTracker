<?php

use Kreait\Firebase\Factory;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$confirmation = (string) getenv('FIREBASE_SMOKE_CONFIRM');
$projectId = (string) getenv('FIREBASE_SMOKE_PROJECT_ID');
$databaseUrl = (string) getenv('FIREBASE_DATABASE_URL');
$credentials = (string) getenv('FIREBASE_CREDENTIALS');
$schoolId = (string) getenv('FIREBASE_SMOKE_SCHOOL_ID');
$firebaseUid = (string) getenv('FIREBASE_SMOKE_FIREBASE_UID');

if ($confirmation !== 'I_UNDERSTAND_TEST_PROJECT') {
    throw new RuntimeException('Smoke cleanup requires explicit confirmation.');
}
if (! preg_match('/^bustracker-smoke-[a-z0-9-]+$/i', $projectId) || preg_match('/prod|production/i', $projectId)) {
    throw new RuntimeException('Smoke cleanup requires an explicitly named non-production smoke project.');
}
if ($databaseUrl === '' || ! str_starts_with($databaseUrl, 'https://') || $credentials === '' || ! is_file($credentials)) {
    throw new RuntimeException('Smoke cleanup requires the HTTPS test database and credentials file.');
}
if (! ctype_digit($schoolId) || ! ctype_digit($firebaseUid)) {
    throw new RuntimeException('Smoke cleanup requires numeric synthetic school and Firebase UID.');
}

$path = "school_users/{$schoolId}/{$firebaseUid}";
if (getenv('FIREBASE_SMOKE_DRY_RUN') === '1') {
    fwrite(STDOUT, json_encode(['status' => 'DRY_RUN', 'path' => $path], JSON_THROW_ON_ERROR).PHP_EOL);
    exit(0);
}

$database = (new Factory)
    ->withServiceAccount($credentials)
    ->withDatabaseUri($databaseUrl)
    ->createDatabase();
$database->getReference($path)->remove();
fwrite(STDOUT, json_encode(['status' => 'CLEANED', 'path' => $path], JSON_THROW_ON_ERROR).PHP_EOL);
