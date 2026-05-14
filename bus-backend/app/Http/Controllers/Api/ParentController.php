<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\Notification;
use App\Models\Presence;
use App\Models\Student;
use App\Models\Trip;
use App\Models\Admin;
use App\Services\NotificationBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $parent = $request->user();
        $student = Student::query()
            ->with(['bus.activeTrip', 'parent'])
            ->where('parent_id', $parent->id)
            ->orderBy('id')
            ->first();

        $bus = $student?->bus;

        return response()->json([
            'student' => $student ? $this->serializeStudent($student) : null,
            'bus' => $bus ? $this->serializeBus($bus) : null,
            'notifications' => $this->serializeNotifications($parent->id),
        ]);
    }

    public function linkChild(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_code' => ['required', 'string', 'exists:students,reg_code'],
        ]);

        $student = Student::query()->where('reg_code', $validated['reg_code'])->firstOrFail();
        $student->update(['parent_id' => $request->user()->id]);

        return response()->json([
            'message' => 'Child linked successfully.',
            'student' => $this->serializeStudent($student->fresh(['bus', 'parent'])),
        ]);
    }

    public function confirmLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'latitude'   => ['required', 'numeric', 'between:-90,90'],
            'longitude'  => ['required', 'numeric', 'between:-180,180'],
        ]);

        $parent = $request->user();
        $student = Student::query()
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

    public function declareAbsence(Request $request, NotificationBroadcaster $broadcaster): JsonResponse
    {
        $validated = $request->validate([
            'studentId' => ['required', 'integer', 'exists:students,id'],
        ]);

        $parent = $request->user();
        $student = Student::query()
            ->with('bus.driver')
            ->where('id', $validated['studentId'])
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        $student->update(['status' => 'absent']);
        $trip = Trip::query()
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

        $admins = Admin::query()
            ->where('status', 'active')
            ->get(['id']);

        foreach ($admins as $admin) {
            $notification = Notification::create([
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
        return response()->json([
            'notifications' => $this->serializeNotifications($request->user()->id),
        ]);
    }

    private function serializeNotifications(int $userId): array
    {
        return Notification::query()
            ->where('recipient_user_id', $userId)
            ->latest()
            ->take(50)
            ->get()
            ->map(fn (Notification $notification) => [
                'id' => (string) $notification->id,
                'title' => $notification->title,
                'message' => $notification->message,
                'studentName' => $notification->payload['studentName'] ?? null,
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
        return [
            'id' => (string) $bus->id,
            'name' => $bus->bus_name,
            'routeName' => $bus->route_name,
            'driverName' => $bus->driver?->name ?? '',
            'plateNumber' => $bus->plate_number,
            'tripStatus' => $bus->trip_status,
            'activeTripId' => $bus->activeTrip?->id ? (string) $bus->activeTrip->id : null,
            'location' => ($bus->latitude_actuelle !== null && $bus->longitude_actuelle !== null)
                ? ['lat' => (float) $bus->latitude_actuelle, 'lng' => (float) $bus->longitude_actuelle]
                : null,
        ];
    }
}
