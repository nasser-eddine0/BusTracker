<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Bus;
use App\Models\Chauffeur;
use App\Models\Notification;
use App\Models\Student;
use App\Models\Trip;
use App\Services\NotificationBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if ($bus->activeTrip) {
            $bus->update([
                'trip_status' => 'in_progress',
                'trip_started_at' => $bus->activeTrip->started_at,
                'trip_completed_at' => null,
            ]);

            return response()->json([
                'message' => 'Trip resumed.',
                'tripId' => (string) $bus->activeTrip->id,
                'trip' => [
                    'id' => (string) $bus->activeTrip->id,
                    'status' => $bus->activeTrip->status,
                    'type' => $bus->activeTrip->type,
                    'tripDate' => optional($bus->activeTrip->trip_date)->toDateString(),
                    'startedAt' => optional($bus->activeTrip->started_at)->toIso8601String(),
                ],
            ]);
        }

        $trip = DB::transaction(function () use ($bus, $driver, $validated) {
            $trip = Chauffeur::query()->findOrFail($driver->id)->startTrip(
                $bus,
                $validated['type'] ?? 'pickup'
            );

            $bus->update([
                'trip_status' => 'in_progress',
                'trip_started_at' => now(),
                'trip_completed_at' => null,
            ]);

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
                'recorded_at' => $entry['recorded_at'] ?? now(),
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
