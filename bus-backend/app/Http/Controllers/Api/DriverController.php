<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exceptions\FirebaseRequestException;
use App\Models\Bus;
use App\Models\Notification;
use App\Models\Presence;
use App\Models\Student;
use App\Models\Trip;
use App\Services\AdminNotificationRecipients;
use App\Services\FirebaseService;
use App\Services\NotificationBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $driver = $request->user();
        $schoolId = (int) $driver->school_id;

        $bus = Bus::query()
            ->where('school_id', $schoolId)
            ->with(['students.parent', 'activeTrip'])
            ->where('driver_id', $driver->id)
            ->first();
        $latestTrip = $bus?->trips()->latest('trip_date')->latest('id')->first();

        // If there is no active trip and the last trip is from a previous day, reset old statuses.
        // Keep today's completed statuses (e.g. dropped at school) visible until a new trip starts.
        if ($bus && !$bus->activeTrip) {
            if ($bus->trip_status !== 'idle') {
                $bus->update([
                    'trip_status' => 'idle',
                    'trip_started_at' => null,
                    'trip_completed_at' => now(),
                ]);
            }
            if (!$latestTrip || optional($latestTrip->trip_date)->toDateString() !== now()->toDateString()) {
                $bus->students()->whereIn('status', ['mounted', 'in_bus', 'dropped', 'absent'])->update(['status' => 'waiting']);
            }
            $bus->refresh();
            $bus->load(['students.parent', 'activeTrip']);
        }

        return response()->json([
            'bus' => $bus ? $this->serializeBus($bus) : null,
            'students' => $bus
                ? $bus->students
                    ->sortBy('full_name')
                    ->mapWithKeys(fn (Student $student) => [(string) $student->id => $this->serializeStudent($student)])
                    ->all()
                : [],
            'notifications' => Notification::query()
                ->where('school_id', $schoolId)
                ->where('recipient_user_id', $driver->id)
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (Notification $notification) => [
                    'id' => (string) $notification->id,
                    'studentId' => $notification->student_id ? (string) $notification->student_id : null,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'helper' => $notification->message,
                    'read' => $notification->read_at !== null,
                    'createdAt' => optional($notification->date_envoi ?? $notification->created_at)->toIso8601String(),
                ])
                ->all(),
        ]);
    }

    public function startTrip(Request $request, NotificationBroadcaster $broadcaster, AdminNotificationRecipients $adminRecipients): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        $validated = $request->validate([
            'busId' => ['required', 'integer', $this->tenantExists('buses', $schoolId)],
        ]);

        $driver = $request->user();
        $bus = Bus::query()
            ->where('school_id', $schoolId)
            ->where('id', $validated['busId'])
            ->where('driver_id', $driver->id)
            ->firstOrFail();

        $trip = $driver->startTrip($bus);

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
            (int) $bus->school_id,
            $driver->id,
            'trip_started',
            'Trajet demarre',
            "{$bus->bus_name} a commence sa tournee.",
            [
                'busName' => $bus->bus_name,
                'driverName' => $driver->name,
            ],
            $broadcaster,
            $adminRecipients
        );

        return response()->json(['message' => 'Trip started.']);
    }

    public function updateStudentStatus(Request $request, Student $student, NotificationBroadcaster $broadcaster, AdminNotificationRecipients $adminRecipients): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        $validated = $request->validate([
            'status' => ['required', Rule::in(['mounted', 'absent', 'in_bus'])],
            'busId' => ['required', 'integer', $this->tenantExists('buses', $schoolId)],
        ]);

        $driver = $request->user();
        $bus = Bus::query()
            ->where('school_id', $schoolId)
            ->where('id', $validated['busId'])
            ->where('driver_id', $driver->id)
            ->firstOrFail();

        if ((int) $student->bus_id !== (int) $bus->id) {
            return response()->json(['message' => 'Student is not assigned to this bus.'], 422);
        }

        $student->update(['status' => $validated['status']]);

        $trip = Trip::query()
            ->where('school_id', $schoolId)
            ->where('bus_id', $bus->id)
            ->where('status', 'in_progress')
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
                            'school_id' => $bus->school_id,
                            'status' => $validated['status'],
                    'recorded_at' => now(),
                ]
            );
        }

        $this->projectRealtime('student_status_updated', [
            'student_id' => (int) $student->id,
            'trip_id' => $trip?->id ? (int) $trip->id : null,
            'school_id' => (int) $schoolId,
        ], fn (FirebaseService $firebase) => $firebase->updateStudentStatus((int) $student->id, $validated['status'], $trip));

        $statusLabels = ['mounted' => 'got on the bus', 'in_bus' => 'got on the bus', 'absent' => 'is absent today'];
        $statusLabel = $statusLabels[$validated['status']] ?? $validated['status'];

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
            (int) $bus->school_id,
            $driver->id,
            $validated['status'],
            'Mise a jour eleve',
            "{$student->full_name} a ete marque " . (in_array($validated['status'], ['mounted', 'in_bus']) ? 'present a bord.' : 'absent.'),
            [
                'studentName' => $student->full_name,
                'busName' => $bus->bus_name,
                'driverName' => $driver->name,
            ],
            $broadcaster,
            $adminRecipients
        );

        return response()->json(['message' => 'Student status updated.']);
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
        int $schoolId,
        int $authorId,
        string $type,
        string $title,
        string $message,
        array $payload,
        NotificationBroadcaster $broadcaster,
        AdminNotificationRecipients $adminRecipients,
    ): void {
        foreach ($adminRecipients->activeForSchool($schoolId) as $admin) {
            $notification = Notification::create([
                'school_id' => $schoolId,
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

    public function notifications(Request $request): JsonResponse
    {
        $driver = $request->user();
        $schoolId = (int) $driver->school_id;

        return response()->json([
            'notifications' => Notification::query()
                ->where('school_id', $schoolId)
                ->where('recipient_user_id', $driver->id)
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (Notification $notification) => [
                    'id' => (string) $notification->id,
                    'studentId' => $notification->student_id ? (string) $notification->student_id : null,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'helper' => $notification->message,
                    'read' => $notification->read_at !== null,
                    'createdAt' => optional($notification->date_envoi ?? $notification->created_at)->toIso8601String(),
                ])
                ->all(),
        ]);
    }

    public function markNotificationsRead(Request $request): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        Notification::query()
            ->where('school_id', $schoolId)
            ->where('recipient_user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marked as read.']);
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

    private function tenantExists(string $table, int $schoolId, string $column = 'id'): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists($table, $column)->where(fn ($query) => $query->where('school_id', $schoolId));
    }

    private function projectRealtime(string $event, array $context, callable $callback): void
    {
        try {
            $callback(app(FirebaseService::class));
        } catch (FirebaseRequestException $exception) {
            Log::warning("Firebase realtime projection failed: {$event}", $context + [
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
