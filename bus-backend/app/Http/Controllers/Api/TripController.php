<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Bus;
use App\Models\Chauffeur;
use App\Models\Notification;
use App\Models\Presence;
use App\Models\Student;
use App\Models\Trip;
use App\Services\NotificationBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TripController extends Controller
{
    public function start(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'busId' => ['required', 'integer', 'exists:buses,id'],
            'type' => ['nullable', Rule::in(['pickup', 'dropoff'])],
        ]);

        $driver = $request->user();
        $bus = Bus::query()
            ->with(['students.parent', 'activeTrip'])
            ->where('id', $validated['busId'])
            ->where('driver_id', $driver->id)
            ->firstOrFail();

        // Force-complete any stale active trip so a fresh one can be created
        if ($bus->activeTrip) {
            $bus->activeTrip->update(['status' => 'completed', 'completed_at' => now()]);
        }

        $trip = DB::transaction(function () use ($bus, $driver, $validated) {
            // Reset all students to waiting before starting a new trip
            $bus->students()->update(['status' => 'waiting']);

            $trip = Chauffeur::query()->findOrFail($driver->id)->startTrip(
                $bus,
                $validated['type'] ?? 'pickup'
            );

            $bus->update([
                'trip_status' => 'in_progress',
                'trip_started_at' => now(),
                'trip_completed_at' => null,
            ]);

            // Bulk-insert presence records for all students assigned to this bus
            $presenceRows = $bus->students->map(fn (Student $student) => [
                'student_id' => $student->id,
                'trip_id' => $trip->id,
                'status' => 'waiting',
                'recorded_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ])->all();

            if (count($presenceRows)) {
                DB::table('presences')->insert($presenceRows);
            }

            return $trip;
        });

        foreach ($bus->students as $student) {
            $this->createParentNotification(
                $student,
                $bus,
                $trip,
                (int) $driver->id,
                'trip_started',
                'Trip started',
                "{$bus->bus_name} has started the route.",
                $broadcaster
            );
        }

        $this->createAdminNotifications(
            (int) $driver->id,
            'trip_started',
            'Trajet demarre',
            "{$bus->bus_name} a commence sa tournee.",
            [
                'busName' => $bus->bus_name,
                'driverName' => $driver->name,
            ],
            $broadcaster
        );

        return response()->json([
            'message' => 'Trip started.',
            'tripId' => (string) $trip->id,
            'trip' => [
                'id' => (string) $trip->id,
                'status' => $trip->status,
                'type' => $trip->type,
                'tripDate' => optional($trip->trip_date)->toDateString(),
                'startedAt' => optional($trip->started_at)->toIso8601String(),
            ],
        ], 201);
    }

    public function finalize(Request $request, Trip $trip, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'attendance' => ['required', 'array', 'min:1'],
            'attendance.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'attendance.*.status' => ['required', Rule::in(['waiting', 'mounted', 'absent', 'dropped'])],
            'attendance.*.recorded_at' => ['nullable', 'date'],
            'final_location' => ['nullable', 'array'],
            'final_location.lat' => ['required_with:final_location', 'numeric'],
            'final_location.lng' => ['required_with:final_location', 'numeric'],
        ]);

        $driver = $request->user();
        $trip->loadMissing(['bus.students.parent', 'driver']);

        if ((int) $trip->driver_id !== (int) $driver->id) {
            return response()->json(['message' => 'You are not allowed to finalize this trip.'], 403);
        }

        $attendanceRows = collect($validated['attendance'])
            ->map(fn (array $entry) => [
                'student_id' => (int) $entry['student_id'],
                'trip_id' => (int) $trip->id,
                'status' => $entry['status'],
                'recorded_at' => !empty($entry['recorded_at'])
                    ? \Illuminate\Support\Carbon::parse($entry['recorded_at'])
                    : now(),
            ])
            ->values();

        $allowedStudentIds = $trip->bus->students->pluck('id')->map(fn ($id) => (int) $id)->all();
        $invalidStudentIds = $attendanceRows
            ->pluck('student_id')
            ->reject(fn (int $studentId) => in_array($studentId, $allowedStudentIds, true))
            ->values();

        if ($invalidStudentIds->isNotEmpty()) {
            return response()->json([
                'message' => 'One or more students are not assigned to this bus.',
                'studentIds' => $invalidStudentIds->all(),
            ], 422);
        }

        DB::transaction(function () use ($trip, $attendanceRows, $validated) {
            DB::table('presences')->upsert(
                $attendanceRows->all(),
                ['student_id', 'trip_id'],
                ['status', 'recorded_at']
            );

            Student::query()
                ->whereIn('id', $attendanceRows->pluck('student_id')->all())
                ->get()
                ->each(function (Student $student) use ($attendanceRows): void {
                    $status = $attendanceRows->firstWhere('student_id', (int) $student->id)['status'] ?? null;
                    if ($status !== null) {
                        $student->update(['status' => $status]);
                    }
                });

            $trip->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            $trip->bus->update([
                'trip_status' => 'completed',
                'trip_completed_at' => now(),
                'latitude_actuelle' => $validated['final_location']['lat'] ?? $trip->bus->latitude_actuelle,
                'longitude_actuelle' => $validated['final_location']['lng'] ?? $trip->bus->longitude_actuelle,
            ]);
        });

        foreach ($trip->bus->students as $student) {
            $status = $attendanceRows->firstWhere('student_id', (int) $student->id)['status'] ?? null;
            if (!$status || !$student->parent_id) {
                continue;
            }

            $message = $status === 'dropped'
                ? "{$student->full_name} has been dropped off."
                : "{$student->full_name} was finalized as {$status}.";

            $this->createParentNotification(
                $student,
                $trip->bus,
                $trip,
                (int) $driver->id,
                'trip_finalized',
                'Trip finalized',
                $message,
                $broadcaster
            );
        }

        $this->createAdminNotifications(
            (int) $driver->id,
            'trip_completed',
            'Trajet termine',
            "{$trip->bus->bus_name} a termine la tournee.",
            [
                'busName' => $trip->bus->bus_name,
                'driverName' => $driver->name,
                'tripId' => (string) $trip->id,
            ],
            $broadcaster
        );

        return response()->json([
            'message' => 'Trip finalized.',
            'tripId' => (string) $trip->id,
            'presencesCount' => $attendanceRows->count(),
        ]);
    }

    public function pingLocation(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'tripId' => ['required', 'integer', 'exists:trips,id'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'currentTargetId' => ['nullable', 'integer', 'exists:students,id'],
        ]);

        $driver = $request->user();
        $trip = Trip::query()
            ->with('bus')
            ->where('id', $validated['tripId'])
            ->where('driver_id', $driver->id)
            ->where('status', 'in_progress')
            ->firstOrFail();

        // Update bus live coordinates
        $trip->bus->update([
            'latitude_actuelle' => $validated['latitude'],
            'longitude_actuelle' => $validated['longitude'],
        ]);

        $alerts = [];

        // Geofencing: check distance to current target student
        if ($validated['currentTargetId']) {
            $student = Student::query()
                ->with('parent')
                ->where('id', $validated['currentTargetId'])
                ->where('bus_id', $trip->bus_id)
                ->first();

            if ($student && $student->latitude !== null && $student->longitude !== null) {
                $distance = $this->haversineMeters(
                    $validated['latitude'],
                    $validated['longitude'],
                    $student->latitude,
                    $student->longitude
                );

                // Trigger 1: <= 2000m (≈5 min away) — "bus is near"
                $nearCacheKey = "trip_{$trip->id}_student_{$student->id}_near";
                if ($distance <= 2000 && !Cache::has($nearCacheKey) && $student->parent_id) {
                    $this->createParentNotification(
                        $student,
                        $trip->bus,
                        $trip,
                        (int) $driver->id,
                        'bus_near',
                        'Bus approaching',
                        "Le bus est proche, environ 5 minutes. Préparez {$student->full_name}.",
                        $broadcaster
                    );
                    Cache::put($nearCacheKey, true, now()->addHours(2));
                    $alerts[] = 'near';
                }

                // Trigger 2: <= 50m — "bus is at the door"
                $arrivedCacheKey = "trip_{$trip->id}_student_{$student->id}_arrived";
                if ($distance <= 50 && !Cache::has($arrivedCacheKey) && $student->parent_id) {
                    $this->createParentNotification(
                        $student,
                        $trip->bus,
                        $trip,
                        (int) $driver->id,
                        'bus_arrived',
                        'Bus arrived',
                        "Le bus est devant la porte pour {$student->full_name}.",
                        $broadcaster
                    );
                    Cache::put($arrivedCacheKey, true, now()->addHours(2));
                    $alerts[] = 'arrived';
                }

                return response()->json([
                    'distance' => round($distance),
                    'alerts' => $alerts,
                ]);
            }
        }

        return response()->json([
            'distance' => null,
            'alerts' => $alerts,
        ]);
    }

    public function nudgeParent(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'tripId' => ['required', 'integer', 'exists:trips,id'],
            'studentId' => ['required', 'integer', 'exists:students,id'],
        ]);

        $driver = $request->user();
        $trip = Trip::query()
            ->with('bus')
            ->where('id', $validated['tripId'])
            ->where('driver_id', $driver->id)
            ->where('status', 'in_progress')
            ->firstOrFail();

        $student = Student::query()
            ->with('parent')
            ->where('id', $validated['studentId'])
            ->where('bus_id', $trip->bus_id)
            ->firstOrFail();

        if (!$student->parent_id) {
            return response()->json(['message' => 'Student has no linked parent.'], 422);
        }

        $this->createParentNotification(
            $student,
            $trip->bus,
            $trip,
            (int) $driver->id,
            'nudge',
            'المرجو الإسراع',
            "الحافلة في انتظار {$student->full_name}، المرجو الإسراع!",
            $broadcaster
        );

        return response()->json(['message' => 'Nudge sent.']);
    }

    /**
     * Haversine formula — returns distance in meters between two GPS coordinates.
     */
    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000; // meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    private function createParentNotification(
        Student $student,
        Bus $bus,
        ?Trip $trip,
        int $authorId,
        string $type,
        string $title,
        string $message,
        NotificationBroadcaster $broadcaster,
    ): void {
        if (!$student->parent_id) {
            return;
        }

        $notification = Notification::create([
            'recipient_user_id' => $student->parent_id,
            'parent_id' => $student->parent_id,
            'student_id' => $student->id,
            'bus_id' => $bus->id,
            'trip_id' => $trip?->id,
            'created_by_user_id' => $authorId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'date_envoi' => now(),
            'payload' => [
                'studentName' => $student->full_name,
                'busName' => $bus->bus_name,
            ],
        ]);

        $broadcaster->broadcast($notification);
    }

    private function createAdminNotifications(
        int $authorId,
        string $type,
        string $title,
        string $message,
        array $payload,
        NotificationBroadcaster $broadcaster,
    ): void {
        $admins = Admin::query()
            ->where('status', 'active')
            ->get(['id']);

        foreach ($admins as $admin) {
            $notification = Notification::create([
                'recipient_user_id' => $admin->id,
                'created_by_user_id' => $authorId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'date_envoi' => now(),
                'payload' => $payload,
            ]);

            $broadcaster->broadcast($notification);
        }
    }
}
