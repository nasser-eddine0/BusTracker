<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\Student;
use App\Models\Trip;
use App\Models\User;
use App\Services\FirebaseService;
use App\Services\NotificationBroadcaster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Mock Firebase Service
        $this->mock(FirebaseService::class, function ($mock) {
            $mock->shouldReceive('updateBusLocation')->andReturnNull();
            $mock->shouldReceive('completeTrip')->andReturnNull();
        });

        // Mock Notification Broadcaster
        $this->mock(NotificationBroadcaster::class, function ($mock) {
            $mock->shouldReceive('broadcast')->andReturnNull();
        });
        
        // Disable custom middleware that might get in the way of testing basic logic
        $this->withoutMiddleware([\App\Http\Middleware\ThrottleByRole::class]);
    }

    private function createDriverData()
    {
        $school = \App\Models\School::create([
            'name' => 'Test School',
            'subdomain' => 'testschool',
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $driver = User::factory()->create([
            'role' => 'driver',
            'status' => 'active',
            'school_id' => $school->id,
        ]);

        $parent = User::factory()->create([
            'role' => 'parent',
            'status' => 'active',
            'school_id' => $school->id,
        ]);

        $bus = Bus::create([
            'school_id' => $school->id,
            'bus_name' => 'Bus A',
            'plate_number' => '123-ABC',
            'capacity' => 20,
            'driver_id' => $driver->id,
            'latitude_actuelle' => 0,
            'longitude_actuelle' => 0,
        ]);

        $student = Student::create([
            'school_id' => $school->id,
            'full_name' => 'Kid A',
            'reg_code' => 'KID-A-123',
            'parent_id' => $parent->id,
            'bus_id' => $bus->id,
            'latitude' => 0.001,
            'longitude' => 0.001,
            'status' => 'waiting',
        ]);

        return [$driver, $bus, $student];
    }

    public function test_driver_can_start_a_trip()
    {
        // Disable all middleware for this test to bypass school.active etc
        [$driver, $bus, $student] = $this->createDriverData();

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trip/start', [
            'busId' => $bus->id,
            'type' => 'aller',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'tripId', 'trip']);

        $this->assertDatabaseHas('trips', [
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'status' => 'in_progress',
        ]);
        
        $this->assertDatabaseHas('presences', [
            'student_id' => $student->id,
            'status' => 'waiting',
        ]);
    }

    public function test_driver_can_finalize_a_trip()
    {
        [$driver, $bus, $student] = $this->createDriverData();

        $trip = Trip::create([
            'school_id' => $bus->school_id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'in_progress',
            'trip_date' => now(),
            'started_at' => now(),
        ]);

        $response = $this->actingAs($driver, 'sanctum')->postJson("/api/trips/{$trip->id}/finalize", [
            'attendance' => [
                [
                    'student_id' => $student->id,
                    'status' => 'mounted',
                ]
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Trip finalized.']);

        $this->assertDatabaseHas('trips', [
            'id' => $trip->id,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('presences', [
            'student_id' => $student->id,
            'status' => 'mounted',
        ]);
    }

    public function test_driver_can_ping_location()
    {
        $this->withoutMiddleware();
        [$driver, $bus, $student] = $this->createDriverData();

        $trip = Trip::create([
            'school_id' => 1,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'in_progress',
            'trip_date' => now(),
            'started_at' => now(),
        ]);

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trip/ping-location', [
            'tripId' => $trip->id,
            'latitude' => 33.5,
            'longitude' => -7.5,
            'currentTargetId' => $student->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['distance', 'alerts']);
            
        $this->assertDatabaseHas('buses', [
            'id' => $bus->id,
            'latitude_actuelle' => 33.5,
            'longitude_actuelle' => -7.5,
        ]);
    }

    public function test_driver_can_nudge_parent()
    {
        $this->withoutMiddleware();
        [$driver, $bus, $student] = $this->createDriverData();

        $trip = Trip::create([
            'school_id' => 1,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'in_progress',
            'trip_date' => now(),
            'started_at' => now(),
        ]);

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trip/nudge-parent', [
            'tripId' => $trip->id,
            'studentId' => $student->id,
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Nudge sent.']);
    }
}
