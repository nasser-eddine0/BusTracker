<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ParentController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $parent = $request->user();
        $schoolId = (int) $parent->school_id;

        $student = Student::query()
            ->where('school_id', $schoolId)
            ->with(['bus.activeTrip', 'parent'])
            ->where('parent_id', $parent->id)
            ->orderBy('id')
            ->first();

        $bus = $student?->bus;

        return response()->json([
            'student' => $student ? $this->serializeStudent($student) : null,
            'bus' => $bus ? $this->serializeBus($bus) : null,
            'notifications' => $this->serializeNotifications($parent->id, $schoolId),
        ]);
    }

    public function linkChild(Request $request, FirebaseService $firebaseService): JsonResponse
    {
        $parent = $request->user();

        $validated = $request->validate([
            'reg_code' => ['required', 'string'],
        ]);

        $regCode = trim($validated['reg_code']);

        $student = Student::withoutGlobalScope('school')
            ->where('reg_code', $regCode)
            ->first();

        if (!$student) {
            return response()->json([
                'message' => 'The selected registration code is invalid.',
                'errors' => [
                    'reg_code' => ['The selected registration code is invalid.'],
                ],
            ], 422);
        }

        $school = $student->school;
        if (!$school || !$school->is_active) {
            return response()->json([
                'message' => 'This school is deactivated or suspended.',
            ], 403);
        }

        if (!$school->isSubscribed() && !$school->isOnTrial() && !$school->isOnGracePeriod()) {
            return response()->json([
                'message' => 'Your school subscription is inactive or expired. Please update billing to continue.',
            ], 403);
        }

        if ($parent->school_id !== null && (int) $parent->school_id !== (int) $student->school_id) {
            return response()->json([
                'message' => 'This child belongs to a different school. You cannot link children from multiple schools.',
                'errors' => [
                    'reg_code' => ['This registration code belongs to another school.'],
                ],
            ], 422);
        }

        if ($student->parent_id !== null && (int) $student->parent_id !== (int) $parent->id) {
            return response()->json([
                'message' => 'This child is already linked to another parent account.',
                'errors' => [
                    'reg_code' => ['This child is already linked to another parent account.'],
                ],
            ], 422);
        }

        DB::transaction(function () use ($parent, $student, $firebaseService) {
            if ($parent->school_id === null) {
                $parent->update(['school_id' => $student->school_id]);
                // Update Firebase school_users mapping for the parent
                $firebaseService->createCustomTokenForUser($parent->id);
            }
            $student->update(['parent_id' => $parent->id]);
        });

        return response()->json([
            'message' => 'Child linked successfully.',
            'student' => $this->serializeStudent($student->fresh(['bus', 'parent'])),
        ]);
    }

    public function confirmLocation(Request $request): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        $validated = $request->validate([
            'student_id' => ['required', 'integer', $this->tenantExists('students', $schoolId)],
            'latitude'   => ['required', 'numeric', 'between:-90,90'],
            'longitude'  => ['required', 'numeric', 'between:-180,180'],
        ]);

        $parent = $request->user();
        $student = Student::query()
            ->where('school_id', $schoolId)
            ->where('id', $validated['student_id'])
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        $student->update([
            'latitude'           => $validated['latitude'],
            'longitude'          => $validated['longitude'],
            'home_lat'           => $validated['latitude'],
            'home_lng'           => $validated['longitude'],
            'location_conformee' => true,
        ]);

        return response()->json([
            'message' => 'Location confirmed successfully.',
            'student' => $this->serializeStudent($student->fresh(['bus', 'parent'])),
        ]);
    }

    public function declareReady(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        $validated = $request->validate([
            'studentId' => ['required', 'integer', $this->tenantExists('students', $schoolId)],
        ]);

        $parent = $request->user();
        $student = Student::query()
            ->where('school_id', $schoolId)
            ->with('bus.driver')
            ->where('id', $validated['studentId'])
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        if ($student->bus?->driver_id) {
            $notification = Notification::create([
                'recipient_user_id' => $student->bus->driver_id,
                'parent_id' => $parent->id,
                'student_id' => $student->id,
                'bus_id' => $student->bus_id,
                'created_by_user_id' => $parent->id,
                'type' => 'child_ready',
                'title' => 'Child ready',
                'message' => "{$student->full_name} is ready at the pickup point.",
                'date_envoi' => now(),
                'payload' => [
                    'studentName' => $student->full_name,
                    'parentName' => $parent->name,
                ],
            ]);

            $broadcaster->broadcast($notification);
        }

        return response()->json(['message' => 'Ready status sent.']);
    }

    public function declareAbsence(Request $request, NotificationBroadcaster $broadcaster, AdminNotificationRecipients $adminRecipients): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        $validated = $request->validate([
            'studentId' => ['required', 'integer', $this->tenantExists('students', $schoolId)],
        ]);

        $parent = $request->user();
        $student = Student::query()
            ->where('school_id', $schoolId)
            ->with('bus.driver')
            ->where('id', $validated['studentId'])
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        $student->update(['status' => 'absent']);
        $trip = Trip::query()
            ->where('school_id', $schoolId)
            ->where('bus_id', $student->bus_id)
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
                    'school_id' => $schoolId,
                    'status' => 'absent',
                    'recorded_at' => now(),
                ]
            );
        }

        if ($student->bus?->driver_id) {
            $notification = Notification::create([
                'recipient_user_id' => $student->bus->driver_id,
                'parent_id' => $parent->id,
                'student_id' => $student->id,
                'bus_id' => $student->bus_id,
                'trip_id' => $trip?->id,
                'created_by_user_id' => $parent->id,
                'type' => 'absence_declared',
                'title' => 'Parent absence update',
                'message' => "{$student->full_name} has been marked absent by the parent.",
                'date_envoi' => now(),
                'payload' => [
                    'studentName' => $student->full_name,
                    'parentName' => $parent->name,
                ],
            ]);

            $broadcaster->broadcast($notification);
        }

        $notificationSchoolId = (int) $student->school_id;

        foreach ($adminRecipients->activeForSchool($notificationSchoolId) as $admin) {
            $notification = Notification::create([
                'school_id' => $notificationSchoolId,
                'recipient_user_id' => $admin->id,
                'parent_id' => $parent->id,
                'student_id' => $student->id,
                'bus_id' => $student->bus_id,
                'trip_id' => $trip?->id,
                'created_by_user_id' => $parent->id,
                'type' => 'absence_declared',
                'title' => 'Absence parent',
                'message' => "{$student->full_name} a ete marque absent par le parent.",
                'date_envoi' => now(),
                'payload' => [
                    'studentName' => $student->full_name,
                    'parentName' => $parent->name,
                    'busName' => $student->bus?->bus_name,
                ],
            ]);

            $broadcaster->broadcast($notification);
        }

        return response()->json([
            'message' => 'Absence declared.',
            'student' => $this->serializeStudent($student->fresh(['bus', 'parent'])),
        ]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $schoolId = (int) $request->user()->school_id;

        return response()->json([
            'notifications' => $this->serializeNotifications($request->user()->id, $schoolId),
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

    private function serializeNotifications(int $userId, int $schoolId): array
    {
        return Notification::query()
            ->where('school_id', $schoolId)
            ->where('recipient_user_id', $userId)
            ->latest()
            ->take(50)
            ->get()
            ->map(fn (Notification $notification) => [
                'id' => (string) $notification->id,
                'studentId' => $notification->student_id ? (string) $notification->student_id : null,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'studentName' => $notification->payload['studentName'] ?? null,
                'payload' => $notification->payload,
                'read' => $notification->read_at !== null,
                'createdAt' => optional($notification->date_envoi ?? $notification->created_at)->toIso8601String(),
            ])
            ->all();
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'name' => $student->full_name,
            'grade' => $student->grade,
            'address' => $student->address,
            'parentId' => $student->parent_id ? (string) $student->parent_id : '',
            'parentName' => $student->parent?->name ?? '',
            'parentEmail' => $student->parent?->email ?? '',
            'parentPhone' => $student->parent?->phone ?? '',
            'busId' => $student->bus_id ? (string) $student->bus_id : '',
            'status' => $student->status,
            'locationConformee' => (bool) $student->location_conformee,
            'homeLocation' => ($student->latitude !== null && $student->longitude !== null)
                ? ['lat' => (float) $student->latitude, 'lng' => (float) $student->longitude]
                : null,
        ];
    }

    private function serializeBus(Bus $bus): array
    {
        $latestTrip = $bus->trips()->latest('trip_date')->latest('id')->first();

        return [
            'id' => (string) $bus->id,
            'name' => $bus->bus_name,
            'routeName' => $bus->route_name,
            'driverName' => $bus->driver?->name ?? '',
            'plateNumber' => $bus->plate_number,
            'tripStatus' => $bus->trip_status,
            'activeTripId' => $bus->activeTrip?->id ? (string) $bus->activeTrip->id : null,
            'latestTripType' => $latestTrip?->type,
            'location' => ($bus->latitude_actuelle !== null && $bus->longitude_actuelle !== null)
                ? ['lat' => (float) $bus->latitude_actuelle, 'lng' => (float) $bus->longitude_actuelle]
                : null,
        ];
    }

    private function tenantExists(string $table, int $schoolId, string $column = 'id'): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists($table, $column)->where(fn ($query) => $query->where('school_id', $schoolId));
    }
}
