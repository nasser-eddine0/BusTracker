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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $driver = $request->user();
        $bus = Bus::query()->with(['students.parent', 'activeTrip'])->where('driver_id', $driver->id)->first();

        return response()->json([
            'bus' => $bus ? $this->serializeBus($bus) : null,
            'students' => $bus
                ? $bus->students
                    ->sortBy('full_name')
                    ->mapWithKeys(fn (Student $student) => [(string) $student->id => $this->serializeStudent($student)])
                    ->all()
                : [],
            'notifications' => Notification::query()
                ->where('created_by_user_id', $driver->id)
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (Notification $notification) => [
                    'id' => (string) $notification->id,
                    'title' => $notification->title,
                    'helper' => $notification->message,
                ])
                ->all(),
        ]);
    }

    public function startTrip(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'busId' => ['required', 'integer', 'exists:buses,id'],
        ]);

        $driver = $request->user();
        $bus = Bus::query()->where('id', $validated['busId'])->where('driver_id', $driver->id)->firstOrFail();

        $trip = Chauffeur::query()->findOrFail($driver->id)->startTrip($bus);

        $bus->update([
            'trip_status' => 'in_progress',
            'trip_started_at' => now(),
            'trip_completed_at' => null,
        ]);

        foreach ($bus->students()->with('parent')->get() as $student) {
            $this->createParentNotification(
                $student,
                $bus,
                $trip,
                $driver->id,
                'trip_started',
                'Trip started',
                "{$bus->bus_name} has started the route.",
                $broadcaster
            );
        }

        $this->createAdminNotifications(
            $driver->id,
            'trip_started',
            'Trajet demarre',
            "{$bus->bus_name} a commence sa tournee.",
            [
                'busName' => $bus->bus_name,
                'driverName' => $driver->name,
            ],
            $broadcaster
        );

        return response()->json(['message' => 'Trip started.']);
    }

    public function updateStudentStatus(Request $request, Student $student, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['mounted', 'absent'])],
            'busId' => ['required', 'integer', 'exists:buses,id'],
        ]);

        $driver = $request->user();
        $bus = Bus::query()->where('id', $validated['busId'])->where('driver_id', $driver->id)->firstOrFail();

        if ((int) $student->bus_id !== (int) $bus->id) {
            return response()->json(['message' => 'Student is not assigned to this bus.'], 422);
        }

        $student->update(['status' => $validated['status']]);

        $trip = Trip::query()
            ->where('bus_id', $bus->id)
            ->whereDate('trip_date', now()->toDateString())
            ->latest('id')
            ->first();

        if ($trip) {
            Presence::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'trip_id' => $trip->id,
                ],
                [
                    'status' => $validated['status'],
                    'recorded_at' => now(),
                ]
            );
        }

        $statusLabel = $validated['status'] === 'mounted' ? 'got on the bus' : 'is absent today';

        $this->createParentNotification(
            $student->fresh('parent'),
            $bus,
            $trip,
            $driver->id,
            $validated['status'],
            'Student status updated',
            "{$student->full_name} {$statusLabel}.",
            $broadcaster
        );

        $this->createAdminNotifications(
            $driver->id,
            $validated['status'],
            'Mise a jour eleve',
            "{$student->full_name} a ete marque " . ($validated['status'] === 'mounted' ? 'present a bord.' : 'absent.'),
            [
                'studentName' => $student->full_name,
                'busName' => $bus->bus_name,
                'driverName' => $driver->name,
            ],
            $broadcaster
        );

        return response()->json(['message' => 'Student status updated.']);
    }

    public function dropStudents(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'busId' => ['required', 'integer', 'exists:buses,id'],
        ]);

        $driver = $request->user();
        $bus = Bus::query()->with('students.parent')->where('id', $validated['busId'])->where('driver_id', $driver->id)->firstOrFail();
        $trip = Trip::query()
            ->where('bus_id', $bus->id)
            ->whereDate('trip_date', now()->toDateString())
            ->latest('id')
            ->first();

        DB::transaction(function () use ($bus, $trip, $driver, $broadcaster) {
            foreach ($bus->students->where('status', 'mounted') as $student) {
                $student->update(['status' => 'dropped']);

                if ($trip) {
                    Presence::updateOrCreate(
                        [
                            'student_id' => $student->id,
                            'trip_id' => $trip->id,
                        ],
                        [
                            'status' => 'dropped',
                            'recorded_at' => now(),
                        ]
                    );
                }

                $this->createParentNotification(
                    $student,
                    $bus,
                    $trip,
                    $driver->id,
                    'dropped',
                    'Drop-off completed',
                    "{$student->full_name} has been dropped off.",
                    $broadcaster
                );
            }

            $bus->update([
                'trip_status' => 'completed',
                'trip_completed_at' => now(),
            ]);

            if ($trip) {
                $trip->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
            }
        });

        $this->createAdminNotifications(
            $driver->id,
            'trip_completed',
            'Trajet termine',
            "{$bus->bus_name} a termine la tournee et le depot des eleves.",
            [
                'busName' => $bus->bus_name,
                'driverName' => $driver->name,
            ],
            $broadcaster
        );

        return response()->json(['message' => 'Drop-off completed.']);
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

    private function serializeBus(Bus $bus): array
    {
        return [
            'id' => (string) $bus->id,
            'name' => $bus->bus_name,
            'routeName' => $bus->route_name,
            'plateNumber' => $bus->plate_number,
            'capacity' => $bus->capacity,
            'driverName' => $bus->driver?->name ?? '',
            'tripStatus' => $bus->trip_status,
            'activeTripId' => $bus->activeTrip?->id ? (string) $bus->activeTrip->id : null,
            'location' => ($bus->latitude_actuelle !== null && $bus->longitude_actuelle !== null)
                ? ['lat' => (float) $bus->latitude_actuelle, 'lng' => (float) $bus->longitude_actuelle]
                : null,
        ];
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'name' => $student->full_name,
            'address' => $student->address,
            'grade' => $student->grade,
            'busId' => $student->bus_id ? (string) $student->bus_id : '',
            'status' => $student->status,
            'locationConformee' => (bool) $student->location_conformee,
            'homeLocation' => ($student->latitude !== null && $student->longitude !== null)
                ? ['lat' => (float) $student->latitude, 'lng' => (float) $student->longitude]
                : null,
        ];
    }
}
