<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseService
{
    protected string $databaseUrl;

    public function __construct()
    {
        // We'll use the URL from the frontend config or .env if we add it
        $this->databaseUrl = config('services.firebase.database_url', 'https://bustracker-5e6c4-default-rtdb.firebaseio.com');
    }

    /**
     * Update bus location and trip info in Firebase.
     */
    public function updateBusLocation(int $busId, array $data): void
    {
        try {
            Http::patch("{$this->databaseUrl}/active_trips/{$busId}.json", $data);
        } catch (\Exception $e) {
            Log::error("Firebase update failed: " . $e->getMessage());
        }
    }

    /**
     * Update student status in Firebase.
     */
    public function updateStudentStatus(int $studentId, string $status): void
    {
        try {
            Http::patch("{$this->databaseUrl}/students/{$studentId}.json", ['status' => $status]);
        } catch (\Exception $e) {
            Log::error("Firebase student update failed: " . $e->getMessage());
        }
    }
    
    /**
     * Remove a trip from Firebase when completed.
     */
    public function completeTrip(int $busId): void
    {
        try {
            Http::delete("{$this->databaseUrl}/active_trips/{$busId}.json");
        } catch (\Exception $e) {
            Log::error("Firebase trip deletion failed: " . $e->getMessage());
        }
    }
}
