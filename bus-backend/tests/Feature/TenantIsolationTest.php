<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\School;
use App\Models\Student;
use App\Models\Trip;
use App\Models\User;
use App\Services\FirebaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

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
        $firebase->shouldReceive('updateBusLocation')->once();
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
        $firebase->shouldReceive('updateBusLocation')->once();
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
