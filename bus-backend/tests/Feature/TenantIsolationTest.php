<?php

namespace Tests\Feature;

use App\Imports\StudentsImport;
use App\Models\Bus;
use App\Models\School;
use App\Models\Student;
use App\Models\Trip;
use App\Models\User;
use App\Services\FirebaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $storagePath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'bus-tracker-phpunit-'.getmypid();
        $this->app->useStoragePath($storagePath);
        File::ensureDirectoryExists($storagePath.DIRECTORY_SEPARATOR.'app');

        $this->beforeApplicationDestroyed(fn () => File::deleteDirectory($storagePath));
    }

    public function test_school_admin_cannot_read_other_school_resources_from_bootstrap(): void
    {
        [$schoolA, $schoolB, $adminA] = $this->tenantFixture();

        $busA = Bus::create([
            'school_id' => $schoolA->id,
            'bus_name' => 'School A Bus',
            'plate_number' => 'A-001',
            'route_name' => 'A Route',
        ]);

        $busB = Bus::create([
            'school_id' => $schoolB->id,
            'bus_name' => 'School B Bus',
            'plate_number' => 'B-001',
            'route_name' => 'B Route',
        ]);

        $studentA = Student::create([
            'school_id' => $schoolA->id,
            'full_name' => 'School A Student',
            'reg_code' => 'STU-A',
            'bus_id' => $busA->id,
            'status' => 'waiting',
        ]);

        $studentB = Student::create([
            'school_id' => $schoolB->id,
            'full_name' => 'School B Student',
            'reg_code' => 'STU-B',
            'bus_id' => $busB->id,
            'status' => 'waiting',
        ]);

        $response = $this->actingAs($adminA, 'sanctum')->getJson('/api/admin/bootstrap');

        $response->assertOk();
        $response->assertJsonPath("buses.{$busA->id}.name", 'School A Bus');
        $response->assertJsonMissingPath("buses.{$busB->id}");
        $response->assertJsonPath("students.{$studentA->id}.name", 'School A Student');
        $response->assertJsonMissingPath("students.{$studentB->id}");
    }

    public function test_school_admin_cannot_update_or_delete_other_school_bus(): void
    {
        [, $schoolB, $adminA] = $this->tenantFixture();

        $busB = Bus::create([
            'school_id' => $schoolB->id,
            'bus_name' => 'School B Bus',
            'plate_number' => 'B-002',
            'route_name' => 'B Route',
        ]);

        $this->actingAs($adminA, 'sanctum')
            ->putJson("/api/admin/buses/{$busB->id}", [
                'name' => 'Illegal Update',
                'routeName' => 'Blocked',
                'plateNumber' => 'B-002',
                'capacity' => 20,
                'driverId' => null,
            ])
            ->assertNotFound();

        $this->actingAs($adminA, 'sanctum')
            ->deleteJson("/api/admin/buses/{$busB->id}")
            ->assertNotFound();
    }

    public function test_school_admin_cannot_assign_disabled_driver_to_bus(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $driver = User::create([
            'school_id' => $school->id,
            'name' => 'Disabled Driver',
            'email' => 'disabled-driver@example.com',
            'password' => 'password123',
            'role' => 'driver',
            'status' => 'disabled',
        ]);

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Bus Disabled Driver',
            'plate_number' => 'DISABLED-DRV',
            'route_name' => 'Route Disabled',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/buses/{$bus->id}", [
                'name' => 'Bus Disabled Driver',
                'routeName' => 'Route Disabled',
                'plateNumber' => 'DISABLED-DRV',
                'capacity' => 20,
                'driverId' => $driver->id,
            ])
            ->assertUnprocessable();

        $this->assertDatabaseHas('buses', [
            'id' => $bus->id,
            'driver_id' => null,
        ]);
    }

    public function test_school_admin_cannot_create_disabled_driver_already_assigned_to_bus(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Bus New Disabled Driver',
            'plate_number' => 'NEW-DISABLED',
            'route_name' => 'Route New Disabled',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', [
                'role' => 'driver',
                'name' => 'New Disabled Driver',
                'email' => 'new-disabled-driver@example.com',
                'password' => 'password123',
                'status' => 'disabled',
                'busId' => $bus->id,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'new-disabled-driver@example.com',
            'role' => 'driver',
            'status' => 'disabled',
        ]);

        $this->assertDatabaseHas('buses', [
            'id' => $bus->id,
            'driver_id' => null,
        ]);
    }

    public function test_school_admin_cannot_update_or_delete_other_school_student(): void
    {
        [, $schoolB, $adminA] = $this->tenantFixture();

        $studentB = Student::create([
            'school_id' => $schoolB->id,
            'full_name' => 'School B Student',
            'reg_code' => 'STU-B2',
            'status' => 'waiting',
        ]);

        $this->actingAs($adminA, 'sanctum')
            ->putJson("/api/admin/students/{$studentB->id}", [
                'name' => 'Illegal Update',
                'grade' => null,
                'address' => null,
                'regCode' => 'STU-B2',
                'parentId' => null,
                'busId' => null,
                'pickupLat' => null,
                'pickupLng' => null,
            ])
            ->assertNotFound();

        $this->actingAs($adminA, 'sanctum')
            ->deleteJson("/api/admin/students/{$studentB->id}")
            ->assertNotFound();
    }

    public function test_student_import_scopes_parent_lookup_by_school(): void
    {
        [$schoolA, $schoolB] = $this->tenantFixture();

        $parentB = User::create([
            'school_id' => $schoolB->id,
            'name' => 'Parent B',
            'email' => 'parent-b-import@example.com',
            'password' => 'password123',
            'role' => 'parent',
            'status' => 'active',
            'cin' => 'CIN-SHARED',
        ]);

        $import = new StudentsImport([
            'student_name' => 'student_name',
            'parent_cin' => 'parent_cin',
            'parent_name' => 'parent_name',
            'parent_email' => 'parent_email',
            'student_address' => 'student_address',
        ], $schoolA->id);

        $import->collection(new Collection([
            new Collection([
                'student_name' => 'Imported Child',
                'parent_cin' => 'CIN-SHARED',
                'parent_name' => 'Parent A',
                'parent_email' => 'parent-a-import@example.com',
                'student_address' => 'Main Street',
            ]),
        ]));

        $this->assertDatabaseHas('users', [
            'school_id' => $schoolA->id,
            'cin' => 'CIN-SHARED',
            'email' => 'parent-a-import@example.com',
        ]);

        $this->assertDatabaseHas('students', [
            'school_id' => $schoolA->id,
            'full_name' => 'Imported Child',
        ]);

        $this->assertDatabaseMissing('students', [
            'school_id' => $schoolB->id,
            'parent_id' => $parentB->id,
            'full_name' => 'Imported Child',
        ]);
    }

    public function test_student_import_generated_parent_email_is_school_scoped(): void
    {
        [$schoolA, $schoolB] = $this->tenantFixture();
        $mapping = [
            'student_name' => 'student_name',
            'parent_cin' => 'parent_cin',
            'parent_name' => 'parent_name',
            'student_address' => 'student_address',
        ];

        (new StudentsImport($mapping, $schoolA->id))->collection(new Collection([
            new Collection([
                'student_name' => 'Imported Child A',
                'parent_cin' => 'CIN NO EMAIL',
                'parent_name' => 'Parent A',
                'student_address' => 'Main Street A',
            ]),
        ]));

        (new StudentsImport($mapping, $schoolB->id))->collection(new Collection([
            new Collection([
                'student_name' => 'Imported Child B',
                'parent_cin' => 'CIN NO EMAIL',
                'parent_name' => 'Parent B',
                'student_address' => 'Main Street B',
            ]),
        ]));

        $this->assertDatabaseHas('users', [
            'school_id' => $schoolA->id,
            'cin' => 'CIN NO EMAIL',
            'email' => "cin-no-email.school-{$schoolA->id}@parent.generated",
        ]);

        $this->assertDatabaseHas('users', [
            'school_id' => $schoolB->id,
            'cin' => 'CIN NO EMAIL',
            'email' => "cin-no-email.school-{$schoolB->id}@parent.generated",
        ]);
    }

    public function test_school_admin_cannot_finalize_import_from_another_school_temp_path(): void
    {
        [$schoolA, $schoolB, $adminA] = $this->tenantFixture();

        Storage::disk('local')->put("temp/imports/{$schoolB->id}/students.csv", "student_name,parent_cin\nChild,CIN-1\n");

        $this->actingAs($adminA, 'sanctum')
            ->postJson('/api/admin/students/finalize-import', [
                'temporary_file_path' => "temp/imports/{$schoolB->id}/students.csv",
                'mapping' => [
                    'student_name' => 'student_name',
                    'parent_cin' => 'parent_cin',
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Invalid temporary import path. Please re-upload.');

        $this->assertTrue(Storage::disk('local')->exists("temp/imports/{$schoolB->id}/students.csv"));
        $this->assertDatabaseMissing('students', [
            'school_id' => $schoolA->id,
            'full_name' => 'Child',
        ]);
    }

    public function test_school_admin_cannot_finalize_import_with_traversal_path(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/students/finalize-import', [
                'temporary_file_path' => "temp/imports/{$school->id}/../students.csv",
                'mapping' => [
                    'student_name' => 'student_name',
                    'parent_cin' => 'parent_cin',
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Invalid temporary import path. Please re-upload.');
    }

    public function test_school_admin_cannot_assign_disabled_parent_to_student(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $parent = User::create([
            'school_id' => $school->id,
            'name' => 'Disabled Parent',
            'email' => 'disabled-parent@example.com',
            'password' => 'password123',
            'role' => 'parent',
            'status' => 'disabled',
        ]);

        $student = Student::create([
            'school_id' => $school->id,
            'full_name' => 'Student With Disabled Parent',
            'reg_code' => 'DISABLED-PARENT-STUDENT',
            'status' => 'waiting',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/students/{$student->id}", [
                'name' => 'Student With Disabled Parent',
                'grade' => null,
                'address' => null,
                'regCode' => 'DISABLED-PARENT-STUDENT',
                'parentId' => $parent->id,
                'busId' => null,
                'pickupLat' => null,
                'pickupLng' => null,
            ])
            ->assertUnprocessable();

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'parent_id' => null,
        ]);
    }

    public function test_school_admin_cannot_create_student_on_full_bus(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Full Bus Create',
            'plate_number' => 'FULL-CREATE',
            'route_name' => 'Full Route',
            'capacity' => 1,
        ]);

        Student::create([
            'school_id' => $school->id,
            'full_name' => 'Existing Student',
            'reg_code' => 'FULL-CREATE-1',
            'bus_id' => $bus->id,
            'status' => 'waiting',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/students', [
                'name' => 'Overflow Student',
                'grade' => null,
                'address' => 'Overflow Address',
                'regCode' => 'FULL-CREATE-2',
                'parentId' => null,
                'busId' => $bus->id,
                'pickupLat' => null,
                'pickupLng' => null,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bus capacity would be exceeded.');

        $this->assertDatabaseMissing('students', [
            'school_id' => $school->id,
            'reg_code' => 'FULL-CREATE-2',
        ]);
    }

    public function test_school_admin_cannot_update_student_onto_full_bus(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Full Bus Update',
            'plate_number' => 'FULL-UPDATE',
            'route_name' => 'Full Route',
            'capacity' => 1,
        ]);

        Student::create([
            'school_id' => $school->id,
            'full_name' => 'Existing Student',
            'reg_code' => 'FULL-UPDATE-1',
            'bus_id' => $bus->id,
            'status' => 'waiting',
        ]);

        $student = Student::create([
            'school_id' => $school->id,
            'full_name' => 'Unassigned Student',
            'reg_code' => 'FULL-UPDATE-2',
            'status' => 'waiting',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/students/{$student->id}", [
                'name' => 'Unassigned Student',
                'grade' => null,
                'address' => null,
                'regCode' => 'FULL-UPDATE-2',
                'parentId' => null,
                'busId' => $bus->id,
                'pickupLat' => null,
                'pickupLng' => null,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bus capacity would be exceeded.');

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'bus_id' => null,
        ]);
    }

    public function test_school_admin_can_update_student_already_on_full_bus(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Full Bus Same Student',
            'plate_number' => 'FULL-SAME',
            'route_name' => 'Full Route',
            'capacity' => 1,
        ]);

        $student = Student::create([
            'school_id' => $school->id,
            'full_name' => 'Existing Student',
            'reg_code' => 'FULL-SAME-1',
            'bus_id' => $bus->id,
            'status' => 'waiting',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/students/{$student->id}", [
                'name' => 'Existing Student Updated',
                'grade' => null,
                'address' => null,
                'regCode' => 'FULL-SAME-1',
                'parentId' => null,
                'busId' => $bus->id,
                'pickupLat' => null,
                'pickupLng' => null,
            ])
            ->assertOk();

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'full_name' => 'Existing Student Updated',
            'bus_id' => $bus->id,
        ]);
    }

    public function test_school_admin_cannot_reduce_bus_capacity_below_assigned_students(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Capacity Bus',
            'plate_number' => 'CAPACITY-1',
            'route_name' => 'Capacity Route',
            'capacity' => 3,
        ]);

        Student::create([
            'school_id' => $school->id,
            'full_name' => 'Assigned Student One',
            'reg_code' => 'CAP-STU-1',
            'bus_id' => $bus->id,
            'status' => 'waiting',
        ]);

        Student::create([
            'school_id' => $school->id,
            'full_name' => 'Assigned Student Two',
            'reg_code' => 'CAP-STU-2',
            'bus_id' => $bus->id,
            'status' => 'waiting',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/buses/{$bus->id}", [
                'name' => 'Capacity Bus',
                'routeName' => 'Capacity Route',
                'plateNumber' => 'CAPACITY-1',
                'capacity' => 1,
                'driverId' => null,
                'latitude' => null,
                'longitude' => null,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bus capacity cannot be lower than assigned students.');

        $this->assertDatabaseHas('buses', [
            'id' => $bus->id,
            'capacity' => 3,
        ]);
    }

    public function test_school_admin_cannot_store_out_of_range_bus_coordinates(): void
    {
        [, , $admin] = $this->tenantFixture();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/buses', [
                'name' => 'Invalid Coordinate Bus',
                'routeName' => 'Invalid Route',
                'plateNumber' => 'INVALID-COORD-BUS',
                'capacity' => 20,
                'latitude' => 91,
                'longitude' => -181,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['latitude', 'longitude']);

        $this->assertDatabaseMissing('buses', [
            'plate_number' => 'INVALID-COORD-BUS',
        ]);
    }

    public function test_school_admin_cannot_store_out_of_range_student_pickup_coordinates(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/students', [
                'name' => 'Invalid Coordinate Student',
                'grade' => null,
                'address' => 'Invalid Coordinate Address',
                'regCode' => 'INVALID-COORD-STUDENT',
                'parentId' => null,
                'busId' => null,
                'pickupLat' => -91,
                'pickupLng' => 181,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['pickupLat', 'pickupLng']);

        $this->assertDatabaseMissing('students', [
            'school_id' => $school->id,
            'reg_code' => 'INVALID-COORD-STUDENT',
        ]);
    }

    public function test_school_admin_cannot_delete_bus_with_active_trip(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Active Trip Bus',
            'plate_number' => 'ACTIVE-DELETE',
            'route_name' => 'Active Route',
        ]);

        Trip::create([
            'school_id' => $school->id,
            'bus_id' => $bus->id,
            'status' => 'in_progress',
            'trip_date' => now(),
            'started_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/buses/{$bus->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Cannot delete a bus with an active trip.');

        $this->assertFalse($bus->fresh()->trashed());
    }

    public function test_school_admin_cannot_bulk_delete_buses_with_active_trip(): void
    {
        [$school, , $admin] = $this->tenantFixture();

        $activeBus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Active Bulk Bus',
            'plate_number' => 'ACTIVE-BULK',
            'route_name' => 'Active Route',
        ]);

        $idleBus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Idle Bulk Bus',
            'plate_number' => 'IDLE-BULK',
            'route_name' => 'Idle Route',
        ]);

        Trip::create([
            'school_id' => $school->id,
            'bus_id' => $activeBus->id,
            'status' => 'in_progress',
            'trip_date' => now(),
            'started_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/buses/bulk-delete', [
                'busIds' => [$activeBus->id, $idleBus->id],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Cannot delete buses with active trips.');

        $this->assertFalse($activeBus->fresh()->trashed());
        $this->assertFalse($idleBus->fresh()->trashed());
    }

    public function test_school_admin_global_scope_hides_other_school_trip(): void
    {
        [, $schoolB, $adminA] = $this->tenantFixture();

        $tripB = Trip::create([
            'school_id' => $schoolB->id,
            'bus_id' => Bus::create([
                'school_id' => $schoolB->id,
                'bus_name' => 'Trip Bus B',
                'plate_number' => 'B-TRIP',
            ])->id,
            'trip_date' => now()->toDateString(),
            'status' => 'in_progress',
        ]);

        $this->actingAs($adminA, 'sanctum');

        $this->assertNull(Trip::find($tripB->id));
    }

    public function test_driver_can_only_ping_trip_from_assigned_school(): void
    {
        [$schoolA, $schoolB] = $this->tenantFixture();

        $driverA = User::create([
            'school_id' => $schoolA->id,
            'name' => 'Driver A',
            'email' => 'driver-a@example.com',
            'password' => 'password123',
            'role' => 'driver',
            'status' => 'active',
        ]);

        $driverB = User::create([
            'school_id' => $schoolB->id,
            'name' => 'Driver B',
            'email' => 'driver-b@example.com',
            'password' => 'password123',
            'role' => 'driver',
            'status' => 'active',
        ]);

        $busA = Bus::create([
            'school_id' => $schoolA->id,
            'bus_name' => 'Bus A',
            'plate_number' => 'A-DRIVER',
            'driver_id' => $driverA->id,
        ]);

        $busB = Bus::create([
            'school_id' => $schoolB->id,
            'bus_name' => 'Bus B',
            'plate_number' => 'B-DRIVER',
            'driver_id' => $driverB->id,
        ]);

        $tripA = Trip::create([
            'school_id' => $schoolA->id,
            'bus_id' => $busA->id,
            'driver_id' => $driverA->id,
            'trip_date' => now()->toDateString(),
            'status' => 'in_progress',
        ]);

        $tripB = Trip::create([
            'school_id' => $schoolB->id,
            'bus_id' => $busB->id,
            'driver_id' => $driverB->id,
            'trip_date' => now()->toDateString(),
            'status' => 'in_progress',
        ]);

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('updateTripLocation')->once();
        $this->app->instance(FirebaseService::class, $firebase);

        $this->actingAs($driverA, 'sanctum')
            ->postJson('/api/driver/trip/ping-location', [
                'tripId' => $tripA->id,
                'latitude' => 31.6300,
                'longitude' => -8.0089,
            ])
            ->assertOk();

        $this->actingAs($driverA, 'sanctum')
            ->postJson('/api/driver/trip/ping-location', [
                'tripId' => $tripB->id,
                'latitude' => 31.6300,
                'longitude' => -8.0089,
            ])
            ->assertUnprocessable();
    }

    public function test_trip_admin_notifications_are_scoped_to_event_school(): void
    {
        [$schoolA, $schoolB, $adminA] = $this->tenantFixture();

        $driverA = User::create([
            'school_id' => $schoolA->id,
            'name' => 'Driver A Notify',
            'email' => 'driver-a-notify@example.com',
            'password' => 'password123',
            'role' => 'driver',
            'status' => 'active',
        ]);

        $adminB = User::create([
            'school_id' => $schoolB->id,
            'name' => 'School B Admin',
            'email' => 'admin-b@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $busA = Bus::create([
            'school_id' => $schoolA->id,
            'bus_name' => 'Notify Bus A',
            'plate_number' => 'A-NOTIFY',
            'route_name' => 'A Notify Route',
            'driver_id' => $driverA->id,
        ]);

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('projectTripStarted')->once();
        $this->app->instance(FirebaseService::class, $firebase);

        $this->actingAs($driverA, 'sanctum')
            ->postJson('/api/driver/trip/start', [
                'busId' => $busA->id,
                'type' => 'aller',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'school_id' => $schoolA->id,
            'recipient_user_id' => $adminA->id,
            'type' => 'trip_started',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'school_id' => $schoolA->id,
            'recipient_user_id' => $adminB->id,
            'type' => 'trip_started',
        ]);

        $this->assertDatabaseMissing('notifications', [
            'school_id' => $schoolB->id,
            'recipient_user_id' => $adminB->id,
            'type' => 'trip_started',
        ]);
    }

    public function test_super_admin_global_scope_can_view_cross_tenant_data(): void
    {
        [$schoolA, $schoolB] = $this->tenantFixture();

        Bus::create([
            'school_id' => $schoolA->id,
            'bus_name' => 'Bus A',
            'plate_number' => 'A-SUPER',
        ]);
        Bus::create([
            'school_id' => $schoolB->id,
            'bus_name' => 'Bus B',
            'plate_number' => 'B-SUPER',
        ]);

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->actingAs($superAdmin, 'sanctum');

        $this->assertSame(2, Bus::count());
    }

    private function tenantFixture(): array
    {
        $schoolA = School::create([
            'name' => 'School A',
            'subdomain' => 'school-a',
            'max_buses' => 20,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $schoolB = School::create([
            'name' => 'School B',
            'subdomain' => 'school-b',
            'max_buses' => 20,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $adminA = User::create([
            'school_id' => $schoolA->id,
            'name' => 'School A Admin',
            'email' => 'admin-a@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$schoolA, $schoolB, $adminA];
    }
}
