<?php

namespace App\Services;

use App\Exceptions\FirebaseRequestException;
use Kreait\Firebase\Contract\Database;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth as FirebaseAuth;
use Throwable;

class FirebaseService
{
    private Database $database;
    private FirebaseAuth $firebaseAuth;

    public function __construct()
    {
        $credentials = config('services.firebase.credentials');
        $databaseUrl = config('services.firebase.database_url');

        if (!$credentials || !$databaseUrl) {
            throw new FirebaseRequestException('Firebase credentials and database URL must be configured.');
        }

        $credentialsPath = base_path($credentials);
        if (!is_file($credentialsPath)) {
            $credentialsPath = $credentials;
        }

        $factory = (new Factory())
            ->withServiceAccount($credentialsPath)
            ->withDatabaseUri($databaseUrl);

        $this->database = $factory->createDatabase();
        $this->firebaseAuth = $factory->createAuth();
    }

    public function updateBusLocation(int $busId, array $data): void
    {
        $schoolId = $this->resolveSchoolId($data);
        $this->runWithRetry(fn () => $this->database->getReference("active_trips/{$schoolId}/{$busId}")->update($data));
    }

    public function updateStudentStatus(int $studentId, string $status): void
    {
        $schoolId = $this->resolveSchoolId();
        $this->runWithRetry(fn () => $this->database->getReference("students/{$schoolId}/{$studentId}")->update([
            'status' => $status,
        ]));
    }

    public function completeTrip(int $busId): void
    {
        $schoolId = $this->resolveSchoolId();
        $this->runWithRetry(fn () => $this->database->getReference("active_trips/{$schoolId}/{$busId}")->remove());
    }

    /**
     * Create a Firebase custom token for the given user ID and update school_users mapping.
     *
     * @param int $userId The Laravel user ID
     * @return string The Firebase custom token
     * @throws FirebaseRequestException
     */
    public function createCustomTokenForUser(int $userId): string
    {
        $user = \App\Models\User::find($userId);
        
        if (!$user) {
            throw new FirebaseRequestException('User not found.');
        }

        // Create Firebase custom token keyed by the Laravel user ID
        $token = $this->firebaseAuth->createCustomToken((string) $user->id);

        // Update school_users mapping so Firebase RTDB rules can validate the user
        // Only do this if the user belongs to a school (not super_admin)
        if ($user->school_id !== null) {
            $this->runWithRetry(fn () => $this->database->getReference("school_users/{$user->school_id}/{$user->id}")
                ->set([
                    'role' => $user->role,
                    'busId' => $user->drivenBus?->id ?? null,
                    'updatedAt' => now()->toISOString(),
                ]));
        }

        return $token;
    }

    private function runWithRetry(callable $operation): mixed
    {
        $lastError = null;

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                return $operation();
            } catch (Throwable $exception) {
                $lastError = $exception->getMessage();

                if ($attempt < 3) {
                    usleep((int) (100000 * (2 ** ($attempt - 1))));
                }
            }
        }

        throw new FirebaseRequestException("Firebase Admin SDK request failed after 3 attempts: {$lastError}");
    }

    private function resolveSchoolId(array $data = []): int
    {
        $schoolId = $data['school_id'] ?? auth()->user()?->school_id;

        if (!$schoolId) {
            throw new FirebaseRequestException('Unable to resolve school_id for Firebase request.');
        }

        return (int) $schoolId;
    }
}
