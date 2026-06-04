<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\Chauffeur;
use App\Models\Notification;
use App\Models\ParentAccount;
use App\Models\Student;
use App\Models\Trip;
use App\Models\User;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\StudentsImport;
use App\Imports\HeadersOnlyImport;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    public function bootstrap(): JsonResponse
    {
        $admin = request()->user();
        
        // Use select to reduce payload size and eager load only necessary relations
        $users = User::query()
            ->select(['id', 'name', 'email', 'phone', 'role', 'status', 'cin', 'default_password'])
            ->with([
                'drivenBus:id,driver_id,plate_number',
                'children:id,parent_id',
            ])
            ->orderBy('name')
            ->get();

        $buses = Bus::query()
            ->with(['driver:id,name,email', 'activeTrip'])
            ->orderBy('bus_name')
            ->get();

        $students = Student::query()
            ->with(['parent:id,name,email,phone', 'bus:id,bus_name'])
            ->orderBy('full_name')
            ->get();

        $drivers = $users->where('role', 'driver');
        $parents = $users->where('role', 'parent');

        return response()->json([
            'users' => $users->mapWithKeys(fn (User $user) => [(string) $user->id => $this->serializeUser($user)])->all(),
            'drivers' => $drivers->mapWithKeys(fn (User $user) => [(string) $user->id => $this->serializeDriver($user)])->all(),
            'parents' => $parents->mapWithKeys(fn (User $user) => [(string) $user->id => $this->serializeParent($user)])->all(),
            'students' => $students->mapWithKeys(fn (Student $student) => [(string) $student->id => $this->serializeStudent($student)])->all(),
            'buses' => $buses->mapWithKeys(fn (Bus $bus) => [(string) $bus->id => $this->serializeBus($bus)])->all(),
            'summary' => [
                'todayTrips' => Trip::query()->whereDate('trip_date', today())->count(),
            ],
            'notifications' => $admin ? $this->serializeNotifications((int) $admin->id) : [],
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'driver', 'parent'])],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['nullable', Rule::in(['active', 'disabled'])],
            'cin' => ['nullable', 'string', 'max:100'],
            'busId' => ['nullable', 'integer', 'exists:buses,id'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'role' => $validated['role'],
                'name' => $validated['name'],
                'email' => strtolower($validated['email']),
                'phone' => $validated['phone'] ?? null,
                'password' => $validated['password'],
                'default_password' => $validated['password'],
                'status' => $validated['status'] ?? 'active',
                'cin' => $validated['cin'] ?? null,
            ]);

            if ($user->role === 'driver') {
                $this->syncDriverBus($user, $validated['busId'] ?? null);
            }

            return $user;
        });

        return response()->json([
            'message' => 'User created.',
            'user' => $this->serializeUser($user->loadMissing(['drivenBus', 'children'])),
        ], 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => ['required', Rule::in(['active', 'disabled'])],
            'cin' => ['nullable', 'string', 'max:100'],
            'busId' => ['nullable', 'integer', 'exists:buses,id'],
        ]);

        DB::transaction(function () use ($validated, $user) {
            $user->fill([
                'name' => $validated['name'],
                'email' => strtolower($validated['email']),
                'phone' => $validated['phone'] ?? null,
                'status' => $validated['status'],
                'cin' => $validated['cin'] ?? null,
            ]);

            if (!empty($validated['password'])) {
                $user->password = $validated['password'];
                $user->default_password = $validated['password'];
            }

            $user->save();

            if ($user->role === 'driver') {
                $this->syncDriverBus($user, $validated['status'] === 'disabled' ? null : ($validated['busId'] ?? null));
            }

            if ($user->role !== 'driver') {
                Bus::query()->where('driver_id', $user->id)->update(['driver_id' => null]);
            }
        });

        return response()->json([
            'message' => 'User updated.',
            'user' => $this->serializeUser($user->loadMissing(['drivenBus', 'children'])),
        ]);
    }

    public function disableUser(User $user): JsonResponse
    {
        DB::transaction(function () use ($user) {
            $user->update(['status' => 'disabled']);

            if ($user->role === 'driver') {
                Bus::query()->where('driver_id', $user->id)->update(['driver_id' => null]);
            }
        });

        return response()->json(['message' => 'User disabled.']);
    }

    public function destroyUser(User $user): JsonResponse
    {
        DB::transaction(function () use ($user) {
            if ($user->role === 'driver') {
                Bus::query()->where('driver_id', $user->id)->update(['driver_id' => null]);
            }

            if ($user->role === 'parent') {
                Student::query()->where('parent_id', $user->id)->update(['parent_id' => null]);
            }

            $user->delete();
        });

        return response()->json(['message' => 'User deleted.']);
    }

    public function storeStudent(Request $request): JsonResponse
    {
        $validated = $this->validateStudent($request);

        $student = Student::create([
            'full_name' => $validated['name'],
            'grade' => $validated['grade'],
            'address' => $validated['address'],
            'reg_code' => $validated['regCode'] ?? strtoupper(Str::random(8)),
            'parent_id' => $validated['parentId'] ?? null,
            'bus_id' => $validated['busId'] ?? null,
            'home_lat' => $validated['pickupLat'] ?? null,
            'home_lng' => $validated['pickupLng'] ?? null,
            'latitude' => $validated['pickupLat'] ?? null,
            'longitude' => $validated['pickupLng'] ?? null,
            'location_conformee' => $validated['locationConformee'] ?? false,
            'status' => 'waiting',
        ]);

        return response()->json([
            'message' => 'Student created.',
            'student' => $this->serializeStudent($student->fresh(['parent', 'bus'])),
        ], 201);
    }

    public function updateStudent(Request $request, Student $student): JsonResponse
    {
        $validated = $this->validateStudent($request, $student);

        $student->update([
            'full_name' => $validated['name'],
            'grade' => $validated['grade'],
            'address' => $validated['address'],
            'reg_code' => $validated['regCode'] ?? $student->reg_code,
            'parent_id' => $validated['parentId'] ?? null,
            'bus_id' => $validated['busId'] ?? null,
            'home_lat' => $validated['pickupLat'] ?? null,
            'home_lng' => $validated['pickupLng'] ?? null,
            'latitude' => $validated['pickupLat'] ?? null,
            'longitude' => $validated['pickupLng'] ?? null,
            'location_conformee' => $validated['locationConformee'] ?? $student->location_conformee,
        ]);

        return response()->json([
            'message' => 'Student updated.',
            'student' => $this->serializeStudent($student->fresh(['parent', 'bus'])),
        ]);
    }

    public function destroyStudent(Student $student): JsonResponse
    {
        $student->delete();
        return response()->json(['message' => 'Student deleted.']);
    }

    public function bulkDestroyStudents(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'studentIds' => ['required', 'array'],
            'studentIds.*' => ['integer', 'exists:students,id']
        ]);

        Student::whereIn('id', $validated['studentIds'])->delete();

        return response()->json(['message' => 'Students deleted.']);
    }

    public function importPreviewRows(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.name' => ['required', 'string', 'max:255'],
            'rows.*.grade' => ['nullable', 'string', 'max:255'],
            'rows.*.address' => ['required', 'string'],
            'rows.*.parentName' => ['required', 'string', 'max:255'],
            'rows.*.parentEmail' => ['required', 'email', 'max:255'],
            'rows.*.parentPhone' => ['nullable', 'string', 'max:40'],
            'rows.*.regCode' => ['nullable', 'string', 'max:100'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['rows'] as $row) {
                $parent = User::firstOrCreate(
                    ['email' => strtolower($row['parentEmail'])],
                    [
                        'name' => $row['parentName'],
                        'phone' => $row['parentPhone'] ?? null,
                        'role' => 'parent',
                        'status' => 'active',
                        'password' => Str::password(12),
                    ]
                );

                Student::create([
                    'full_name' => $row['name'],
                    'grade' => $row['grade'] ?? null,
                    'address' => $row['address'],
                    'reg_code' => $row['regCode'] ?? strtoupper(Str::random(8)),
                    'parent_id' => $parent->id,
                    'bus_id' => null,
                    'location_conformee' => false,
                    'status' => 'waiting',
                ]);
            }
        });

        return response()->json(['message' => 'Preview import saved.']);
    }

    public function parseImportHeaders(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'mimes:xlsx,csv,xls', 'max:10240'],
        ]);

        // Store the file temporarily
        $path = $request->file('file')->store('temp', 'local');

        // Extract headers using the lightweight HeadersOnlyImport
        $import = new HeadersOnlyImport();
        Excel::import($import, $path, 'local');

        return response()->json([
            'headers'             => $import->getHeaders(),
            'temporary_file_path' => $path,
        ]);
    }

    public function finalizeImport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'temporary_file_path' => ['required', 'string'],
            'mapping'             => ['required', 'array'],
            'mapping.student_name' => ['required', 'string'],
            'mapping.parent_cin'   => ['required', 'string'],
            'mapping.*'            => ['nullable', 'string'],
        ]);

        $path = $validated['temporary_file_path'];

        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'Temporary file not found. Please re-upload.'], 422);
        }

        // Run the import with the user-defined mapping
        Excel::import(
            new StudentsImport($validated['mapping']),
            $path,
            'local'
        );

        // Clean up the temporary file
        Storage::disk('local')->delete($validated['temporary_file_path']);

        return response()->json(['message' => 'Import completed successfully.']);
    }

    public function storeBus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'routeName' => ['required', 'string', 'max:255'],
            'plateNumber' => ['required', 'string', 'max:255', 'unique:buses,plate_number'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'schoolName' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        $bus = Bus::create([
            'bus_name' => $validated['name'],
            'route_name' => $validated['routeName'],
            'plate_number' => $validated['plateNumber'],
            'capacity' => $validated['capacity'] ?? 24,
            'school_name' => $validated['schoolName'] ?? 'BusTracker',
            'latitude_actuelle' => $validated['latitude'] ?? null,
            'longitude_actuelle' => $validated['longitude'] ?? null,
            'trip_status' => 'idle',
        ]);

        return response()->json([
            'message' => 'Bus created.',
            'bus' => $this->serializeBus($bus->fresh(['driver', 'students'])),
        ], 201);
    }

    public function updateBus(Request $request, Bus $bus): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'routeName' => ['required', 'string', 'max:255'],
            'plateNumber' => ['required', 'string', 'max:255', Rule::unique('buses', 'plate_number')->ignore($bus->id)],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'driverId' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'driver'))],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        DB::transaction(function () use ($validated, $bus) {
            $bus->update([
                'bus_name' => $validated['name'],
                'route_name' => $validated['routeName'],
                'plate_number' => $validated['plateNumber'],
                'capacity' => $validated['capacity'] ?? 24,
                'latitude_actuelle' => $validated['latitude'] ?? null,
                'longitude_actuelle' => $validated['longitude'] ?? null,
            ]);

            $this->assignDriverToBus($bus, $validated['driverId'] ?? null);
        });

        return response()->json([
            'message' => 'Bus updated.',
            'bus' => $this->serializeBus($bus->fresh(['driver', 'students'])),
        ]);
    }

    public function assignStudents(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'studentIds' => ['required', 'array', 'min:1'],
            'studentIds.*' => ['integer', 'exists:students,id'],
            'busId' => ['nullable', 'integer', 'exists:buses,id'],
        ]);

        $bus = !empty($validated['busId']) ? Bus::withCount('students')->findOrFail($validated['busId']) : null;
        $students = Student::query()->whereIn('id', $validated['studentIds'])->get();

        if ($bus) {
            $additional = $students->filter(fn (Student $student) => $student->bus_id !== $bus->id)->count();
            if (($bus->students_count + $additional) > $bus->capacity) {
                return response()->json([
                    'message' => 'Bus capacity would be exceeded.',
                ], 422);
            }
        }

        Student::query()->whereIn('id', $validated['studentIds'])->update([
            'bus_id' => $validated['busId'] ?? null,
        ]);

        return response()->json([
            'message' => 'Assignments updated.',
        ]);
    }

    public function destroyBus(Bus $bus): JsonResponse
    {
        DB::transaction(function () use ($bus) {
            Student::query()->where('bus_id', $bus->id)->update(['bus_id' => null]);
            $bus->update(['driver_id' => null]);
            $bus->delete();
        });

        return response()->json(['message' => 'Bus deleted.']);
    }

    public function bulkDestroyUsers(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'userIds' => ['required', 'array'],
            'userIds.*' => ['integer', 'exists:users,id'],
        ]);

        DB::transaction(function () use ($validated) {
            $users = User::whereIn('id', $validated['userIds'])->get();

            foreach ($users as $user) {
                if ($user->role === 'driver') {
                    Bus::query()->where('driver_id', $user->id)->update(['driver_id' => null]);
                } elseif ($user->role === 'parent') {
                    Student::query()->where('parent_id', $user->id)->update(['parent_id' => null]);
                }
            }

            User::whereIn('id', $validated['userIds'])->delete();
        });

        return response()->json(['message' => 'Users deleted.']);
    }

    public function bulkDestroyBuses(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'busIds' => ['required', 'array'],
            'busIds.*' => ['integer', 'exists:buses,id'],
        ]);

        DB::transaction(function () use ($validated) {
            Student::query()->whereIn('bus_id', $validated['busIds'])->update(['bus_id' => null]);
            Bus::whereIn('id', $validated['busIds'])->update(['driver_id' => null]);
            Bus::whereIn('id', $validated['busIds'])->delete();
        });

        return response()->json(['message' => 'Buses deleted.']);
    }

    private function validateStudent(Request $request, ?Student $student = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'grade' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'regCode' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('students', 'reg_code')->ignore($student?->id),
            ],
            'parentId' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'parent'))],
            'busId' => ['nullable', 'integer', 'exists:buses,id'],
            'pickupLat' => ['nullable', 'numeric'],
            'pickupLng' => ['nullable', 'numeric'],
            'locationConformee' => ['nullable', 'boolean'],
        ]);
    }

    private function syncDriverBus(User $driver, ?int $busId): void
    {
        Bus::query()->where('driver_id', $driver->id)->update(['driver_id' => null]);

        if ($busId) {
            Bus::query()->where('id', $busId)->update(['driver_id' => $driver->id]);
            Bus::query()->where('driver_id', $driver->id)->where('id', '!=', $busId)->update(['driver_id' => null]);
        }
    }

    private function assignDriverToBus(Bus $bus, ?int $driverId): void
    {
        if ($driverId) {
            Bus::query()->where('driver_id', $driverId)->where('id', '!=', $bus->id)->update(['driver_id' => null]);
        }

        $bus->update(['driver_id' => $driverId]);
    }

    private function serializeUser(User $user): array
    {
        $user->loadMissing(['drivenBus', 'children']);

        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,
            'cin' => $user->cin,
            'busId' => $user->drivenBus?->id ? (string) $user->drivenBus->id : '',
            'defaultPassword' => $user->default_password,
        ];
    }

    private function serializeDriver(Utilisateur $user): array
    {
        $user->loadMissing('drivenBus');

        [$firstName, $lastName] = array_pad(explode(' ', $user->name, 2), 2, '');

        return [
            'name' => $user->name,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => $user->email,
            'phone' => $user->phone ?? '',
            'cin' => $user->cin ?? '',
            'busId' => $user->drivenBus?->id ? (string) $user->drivenBus->id : '',
            'licensePlate' => $user->drivenBus?->plate_number ?? '',
            'status' => $user->status,
            'defaultPassword' => $user->default_password,
        ];
    }

    private function serializeParent(Utilisateur $user): array
    {
        $user->loadMissing('children');

        return [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? '',
            'childIds' => $user->children->map(fn (Student $student) => (string) $student->id)->values()->all(),
            'status' => $user->status,
            'defaultPassword' => $user->default_password,
        ];
    }

    private function serializeStudent(Student $student): array
    {
        $student->loadMissing(['parent', 'bus']);

        return [
            'name' => $student->full_name,
            'grade' => $student->grade,
            'address' => $this->normalizeStudentAddress($student->address),
            'regCode' => $student->reg_code,
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

    private function normalizeStudentAddress(?string $address): ?string
    {
        if ($address === null) {
            return null;
        }

        return strcasecmp($address, 'unknown') === 0 ? null : $address;
    }

    private function serializeBus(Bus $bus): array
    {
        $bus->loadMissing(['driver', 'activeTrip']);

        return [
            'name' => $bus->bus_name,
            'routeName' => $bus->route_name,
            'driverName' => $bus->driver?->name ?? '',
            'driverEmail' => $bus->driver?->email ?? '',
            'plateNumber' => $bus->plate_number,
            'capacity' => $bus->capacity,
            'schoolName' => $bus->school_name,
            'tripStatus' => $bus->trip_status,
            'activeTripId' => $bus->activeTrip?->id ? (string) $bus->activeTrip->id : null,
            'location' => ($bus->latitude_actuelle !== null && $bus->longitude_actuelle !== null)
                ? ['lat' => (float) $bus->latitude_actuelle, 'lng' => (float) $bus->longitude_actuelle]
                : null,
        ];
    }

    private function serializeNotifications(int $userId): array
    {
        return Notification::query()
            ->where('recipient_user_id', $userId)
            ->latest()
            ->take(20)
            ->get()
            ->map(fn (Notification $notification) => [
                'id' => (string) $notification->id,
                'title' => $notification->title,
                'message' => $notification->message,
                'type' => $notification->type,
                'studentName' => $notification->payload['studentName'] ?? null,
                'busName' => $notification->payload['busName'] ?? null,
                'read' => $notification->read_at !== null,
                'createdAt' => optional($notification->date_envoi ?? $notification->created_at)->toIso8601String(),
            ])
            ->all();
    }
}
