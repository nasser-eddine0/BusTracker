<?php

namespace App\Services;

use App\Exceptions\FirebaseRequestException;
use App\Contracts\MembershipProjectionWriter;
use App\Models\Bus;
use App\Models\School;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Kreait\Firebase\Auth as FirebaseAuth;
use Kreait\Firebase\Contract\Database;
use Kreait\Firebase\Factory;
use Throwable;

class FirebaseService
{
    private Database $database;

    private FirebaseAuth $firebaseAuth;

    private ?MembershipProjectionWriter $membershipWriter = null;

    public function __construct()
    {
        $credentials = config('services.firebase.credentials');
        $databaseUrl = config('services.firebase.database_url');
        $syncDriver = config('services.firebase.sync_driver', 'kreait');

        if (! $credentials || ! $databaseUrl) {
            throw new FirebaseRequestException('Firebase credentials and database URL must be configured.');
        }

        $credentialsPath = base_path($credentials);
        if (! is_file($credentialsPath)) {
            $credentialsPath = $credentials;
        }

        $factoryDatabaseUrl = $syncDriver === 'emulator'
            ? 'https://'.config('services.firebase.project_id', 'demo-bustracker').'-default-rtdb.firebaseio.com'
            : $databaseUrl;

        $factory = (new Factory)
            ->withServiceAccount($credentialsPath)
            ->withDatabaseUri($factoryDatabaseUrl);

        $this->database = $factory->createDatabase();
        $this->firebaseAuth = $factory->createAuth();
        $this->membershipWriter = match ($syncDriver) {
            'kreait' => new KreaitMembershipProjectionWriter($this->database),
            'emulator' => new EmulatorMembershipProjectionWriter,
            default => throw new FirebaseRequestException('Unsupported Firebase sync driver.'),
        };
    }

    public function updateBusLocation(int $busId, array $data): void
    {
        $schoolId = $this->resolveSchoolId($data);
        $tripId = $data['trip_id'] ?? null;

        if (! $tripId) {
            throw new FirebaseRequestException('trip_id is required to update an active trip projection.');
        }

        $this->runWithRetry(function () use ($schoolId, $busId, $tripId, $data): void {
            $this->database->getReference("active_trips/{$schoolId}/{$tripId}")->update($data);
            $this->database->getReference("active_buses/{$schoolId}/{$busId}")->set([
                'trip_id' => (string) $tripId,
                'updated_at' => now()->toISOString(),
            ]);
        });
    }

    public function projectTripStarted(Trip $trip): void
    {
        $trip->loadMissing(['bus.students', 'driver']);

        $schoolId = (int) $trip->school_id;
        $bus = $trip->bus;

        $liveAttendance = $bus->students
            ->mapWithKeys(fn ($student) => [(string) $student->id => [
                'status' => $student->status,
                'updated_at' => now()->toISOString(),
            ]])
            ->all();

        $payload = [
            'trip_id' => (string) $trip->id,
            'school_id' => (string) $schoolId,
            'bus_id' => (string) $bus->id,
            'bus_name' => $bus->bus_name,
            'driver_id' => $trip->driver_id ? (string) $trip->driver_id : null,
            'type' => $trip->type,
            'status' => $trip->status,
            'started_at' => optional($trip->started_at)->toIso8601String(),
            'updated_at' => now()->toISOString(),
            'live_location' => $this->serializeLocation($bus->latitude_actuelle, $bus->longitude_actuelle),
            'live_attendance' => $liveAttendance,
        ];

        $this->runWithRetry(function () use ($schoolId, $trip, $bus, $payload): void {
            $this->database->getReference("active_trips/{$schoolId}/{$trip->id}")->set($payload);
            $this->database->getReference("active_buses/{$schoolId}/{$bus->id}")->set([
                'trip_id' => (string) $trip->id,
                'updated_at' => now()->toISOString(),
            ]);
        });
    }

    public function updateTripLocation(Trip $trip, float $latitude, float $longitude): void
    {
        $this->runWithRetry(fn () => $this->database->getReference("active_trips/{$trip->school_id}/{$trip->id}")->update([
            'live_location' => [
                'lat' => $latitude,
                'lng' => $longitude,
                'updated_at' => now()->toISOString(),
            ],
            'updated_at' => now()->toISOString(),
        ]));
    }

    public function updateTripAttendance(Trip $trip, int $studentId, string $status): void
    {
        $this->runWithRetry(fn () => $this->database->getReference("active_trips/{$trip->school_id}/{$trip->id}/live_attendance/{$studentId}")->update([
            'status' => $status,
            'updated_at' => now()->toISOString(),
        ]));
    }

    public function updateStudentStatus(int $studentId, string $status, ?Trip $trip = null): void
    {
        if ($trip) {
            $this->updateTripAttendance($trip, $studentId, $status);
        }
    }

    public function completeTrip(int $busId, ?int $tripId = null, ?int $schoolId = null): void
    {
        $resolvedSchoolId = $schoolId ?? $this->resolveSchoolId();

        $this->runWithRetry(function () use ($resolvedSchoolId, $busId, $tripId): void {
            if ($tripId) {
                $this->database->getReference("active_trips/{$resolvedSchoolId}/{$tripId}")->remove();
            }
            $this->database->getReference("active_buses/{$resolvedSchoolId}/{$busId}")->remove();
        });
    }

    /**
     * Create a Firebase custom token for the given user ID and update school_users mapping.
     *
     * @param  int  $userId  The Laravel user ID
     * @return string The Firebase custom token
     *
     * @throws FirebaseRequestException
     */
    public function createCustomTokenForUser(int $userId): string
    {
        $user = User::find($userId);

        if (! $user) {
            throw new FirebaseRequestException('User not found.');
        }

        // Create Firebase custom token keyed by the Laravel user ID
        $token = $this->firebaseAuth->createCustomToken((string) $user->id);

        // Kreait 7 returns a Lcobucci token object; the API contract exposes
        // the serialized JWT string expected by Firebase client SDKs.
        return $token->toString();
    }

    public function syncUserMembership(User $user, ?bool $active = null): void
    {
        if ($user->school_id === null) {
            return;
        }

        // Serialize membership refresh with platform suspension and tenant transfers.
        DB::transaction(function () use ($user, $active) {
            $school = School::query()->lockForUpdate()->find($user->school_id);
            $user = User::withoutGlobalScope('school')->withTrashed()->where('school_id', $user->school_id)->find($user->id);
            if (! $school || ! $user) {
                return;
            }

            // Query current assignments; loaded relationships may predate reassignment.
            $busIds = match ($user->role) {
                'driver' => Bus::query()->where('school_id', $user->school_id)
                    ->where('driver_id', $user->id)->pluck('id'),
                'parent' => Bus::query()->where('school_id', $user->school_id)
                    ->whereHas('students', fn ($query) => $query
                        ->where('students.school_id', $user->school_id)
                        ->where('parent_id', $user->id))->pluck('id'),
                default => collect(),
            };
            $isActive = ($active ?? true) && $user->status === 'active' && ! $user->trashed()
                && $school->is_active && $school->isSubscribed();
            $allowedBusIds = $isActive
                ? $busIds->mapWithKeys(fn ($id) => [(string) $id => true])->all()
                : [];

            $payload = [
                    'role' => $user->role,
                    'active' => $isActive,
                    'busId' => $user->role === 'driver' ? $busIds->first() : null,
                    'allowedBusIds' => (object) $allowedBusIds,
                    'updatedAt' => now()->toISOString(),
                ];
            $this->runWithRetry(fn () => $this->membershipWriter()->set((int) $user->school_id, (int) $user->id, $payload));
        });
    }

    public function revokeSchoolMemberships(int $schoolId): void
    {
        $this->runWithRetry(fn () => $this->membershipWriter()->removeSchool($schoolId));
    }

    public function deactivateUserMembership(int $schoolId, int $userId, string $role): void
    {
        $payload = [
                'role' => $role,
                'active' => false,
                'busId' => null,
                'allowedBusIds' => (object) [],
                'updatedAt' => now()->toISOString(),
            ];
        $this->runWithRetry(fn () => $this->membershipWriter()->deactivate($schoolId, $userId, $payload));
    }

    private function membershipWriter(): MembershipProjectionWriter
    {
        return $this->membershipWriter ??= new KreaitMembershipProjectionWriter($this->database);
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

        if (! $schoolId) {
            throw new FirebaseRequestException('Unable to resolve school_id for Firebase request.');
        }

        return (int) $schoolId;
    }

    private function serializeLocation(mixed $latitude, mixed $longitude): ?array
    {
        if ($latitude === null || $longitude === null) {
            return null;
        }

        return [
            'lat' => (float) $latitude,
            'lng' => (float) $longitude,
            'updated_at' => now()->toISOString(),
        ];
    }
}
