<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\User;
use App\Services\FirebaseMembershipSynchronizer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Kreait\Firebase\Factory;

class Phase23SmokeFixture extends Seeder
{
    public function run(): void
    {
        $database = (string) config('database.connections.sqlite.database');
        $confirmation = (string) env('FIREBASE_SMOKE_CONFIRM');
        $projectId = (string) env('FIREBASE_SMOKE_PROJECT_ID');
        $email = (string) env('FIREBASE_SMOKE_USER_EMAIL');
        $password = (string) env('FIREBASE_SMOKE_USER_PASSWORD');
        $superEmail = (string) env('FIREBASE_SMOKE_SUPER_ADMIN_EMAIL');
        $superPassword = (string) env('FIREBASE_SMOKE_SUPER_ADMIN_PASSWORD');

        $temp = realpath(sys_get_temp_dir());
        $resolvedDatabase = realpath($database) ?: $database;
        $tempPrefix = $temp ? rtrim(strtolower(str_replace('\\', '/', $temp)), '/').'/' : '';
        $databasePath = strtolower(str_replace('\\', '/', $resolvedDatabase));
        if (config('database.default') !== 'sqlite'
            || $tempPrefix === ''
            || ! str_starts_with($databasePath, $tempPrefix)
            || $confirmation !== 'I_UNDERSTAND_TEST_PROJECT'
            || ! preg_match('/^bustracker-smoke-[a-z0-9-]+$/i', $projectId)
            || preg_match('/prod|production/i', $projectId)
            || $email === '' || $password === '' || $superEmail === '' || $superPassword === '') {
            throw new \RuntimeException('Phase 23 requires confirmed smoke credentials and a temporary SQLite database.');
        }

        $school = School::create([
            'name' => 'Synthetic Firebase Smoke School',
            'subdomain' => 'firebase-smoke-'.bin2hex(random_bytes(4)),
            'is_active' => true,
            'subscription_status' => 'active',
        ]);
        $user = User::create([
            'name' => 'Synthetic Firebase Smoke Admin',
            'email' => $email,
            'password' => Hash::make($password),
            'school_id' => $school->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
        User::create([
            'name' => 'Synthetic Firebase Smoke Super Admin',
            'email' => $superEmail,
            'password' => Hash::make($superPassword),
            'school_id' => null,
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $sync = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        $sync->refresh();
        $databaseUrl = (string) config('services.firebase.database_url');
        $credentialsPath = (string) config('services.firebase.credentials');
        $resolvedCredentials = base_path($credentialsPath);
        if (! is_file($resolvedCredentials)) {
            $resolvedCredentials = $credentialsPath;
        }
        $membershipPath = "school_users/{$school->id}/{$user->id}";
        $kreaitReadBack = (new Factory)
            ->withServiceAccount($resolvedCredentials)
            ->withDatabaseUri($databaseUrl)
            ->createDatabase()
            ->getReference($membershipPath)
            ->getValue();

        fwrite(STDOUT, json_encode([
            'school_id' => $school->id,
            'user_id' => $user->id,
            'canonical_membership' => "school_users/{$school->id}/<firebase_uid>",
            'queue_default' => config('queue.default'),
            'sync_id' => $sync->id,
            'sync_status' => $sync->status,
            'sync_attempts' => $sync->attempts,
            'sync_error' => $sync->last_error,
            'desired_active' => $sync->desired_active,
            'firebase_project_id' => $projectId,
            'firebase_database_host' => parse_url($databaseUrl, PHP_URL_HOST),
            'kreait_membership_path' => $membershipPath,
            'kreait_read_back' => $kreaitReadBack,
            'credentials' => 'created from explicit environment variables; values not printed',
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
