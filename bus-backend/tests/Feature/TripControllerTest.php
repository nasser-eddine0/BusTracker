<?php

namespace Tests\Feature;

use App\Http\Middleware\ThrottleByRole;
use App\Models\Bus;
use App\Models\School;
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
            $mock->shouldReceive('projectTripStarted')->andReturnNull();
            $mock->shouldReceive('updateTripLocation')->andReturnNull();
            $mock->shouldReceive('updateTripAttendance')->andReturnNull();
            $mock->shouldReceive('updateStudentStatus')->andReturnNull();
            $mock->shouldReceive('completeTrip')->andReturnNull();
        });

        // Mock Notification Broadcaster
        $this->mock(NotificationBroadcaster::class, function ($mock) {
            $mock->shouldReceive('broadcast')->andReturnNull();
        });

        // Disable custom middleware that might get in the way of testing basic logic
        $this->withoutMiddleware([ThrottleByRole::class]);
    }

    private function createDriverData()
    {
        $school = School::create([
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

    public function test_dashboard_reload_preserves_todays_active_trip_and_attendance(): void
    {
        $this->travelTo(now()->startOfDay()->addHours(9));
        [$driver, $bus, $student] = $this->createDriverData();

        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/trip/start', ['busId' => $bus->id, 'type' => 'aller'])
            ->assertCreated()
            ->json('tripId');

        $this->postJson("/api/driver/students/{$student->id}/status", [
            'busId' => $bus->id,
            'status' => 'mounted',
        ])->assertOk();

        $startedAt = $bus->fresh()->trip_started_at->toISOString();

        for ($reload = 0; $reload < 2; $reload++) {
            $this->getJson('/api/driver/dashboard')
                ->assertOk()
                ->assertJsonPath('bus.activeTripId', (string) $tripId)
                ->assertJsonPath('bus.tripStatus', 'in_progress')
                ->assertJsonPath("students.{$student->id}.status", 'mounted');
        }

        $this->assertDatabaseHas('trips', [
            'id' => $tripId,
            'status' => 'in_progress',
            'completed_at' => null,
        ]);
        $this->assertDatabaseHas('presences', [
            'trip_id' => $tripId,
            'student_id' => $student->id,
            'status' => 'mounted',
        ]);
        $this->assertSame('mounted', $student->fresh()->status);
        $this->assertSame($startedAt, $bus->fresh()->trip_started_at?->toISOString());
        $this->assertNull($bus->fresh()->trip_completed_at);
    }

    public function test_trip_start_broadcasts_created_notifications()
    {
        [$driver, $bus] = $this->createDriverData();

        $broadcaster = \Mockery::mock(NotificationBroadcaster::class);
        $broadcaster->shouldReceive('broadcast')->once();
        $this->app->instance(NotificationBroadcaster::class, $broadcaster);

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trip/start', [
            'busId' => $bus->id,
            'type' => 'aller',
        ])->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $bus->students()->first()->parent_id,
            'type' => 'trip_started',
        ]);
    }

    public function test_starting_trip_completes_existing_active_trip_for_bus()
    {
        [$driver, $bus, $student] = $this->createDriverData();

        $oldTrip = Trip::create([
            'school_id' => $bus->school_id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'in_progress',
            'trip_date' => now(),
            'started_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trip/start', [
            'busId' => $bus->id,
            'type' => 'retour',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('trips', [
            'id' => $oldTrip->id,
            'status' => 'completed',
        ]);

        $this->assertSame(1, Trip::where('bus_id', $bus->id)->where('status', 'in_progress')->count());
        $this->assertDatabaseHas('students', [
            'id' => $student->id,
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
                ],
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

    public function test_trip_finalize_broadcasts_created_notifications()
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

        $broadcaster = \Mockery::mock(NotificationBroadcaster::class);
        $broadcaster->shouldReceive('broadcast')->once();
        $this->app->instance(NotificationBroadcaster::class, $broadcaster);

        $this->actingAs($driver, 'sanctum')->postJson("/api/trips/{$trip->id}/finalize", [
            'attendance' => [
                [
                    'student_id' => $student->id,
                    'status' => 'dropped',
                ],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'recipient_user_id' => $student->parent_id,
            'type' => 'trip_finalized',
        ]);
    }

    public function test_driver_cannot_finalize_completed_trip_again()
    {
        [$driver, $bus, $student] = $this->createDriverData();

        $trip = Trip::create([
            'school_id' => $bus->school_id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'completed',
            'trip_date' => now(),
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/trips/{$trip->id}/finalize", [
            'attendance' => [
                [
                    'student_id' => $student->id,
                    'status' => 'mounted',
                ],
            ],
        ])->assertStatus(409);
    }

    public function test_finalize_rejects_out_of_range_final_location()
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

        $this->actingAs($driver, 'sanctum')->postJson("/api/trips/{$trip->id}/finalize", [
            'attendance' => [
                [
                    'student_id' => $student->id,
                    'status' => 'mounted',
                ],
            ],
            'final_location' => [
                'lat' => 100,
                'lng' => -7.5,
            ],
        ])->assertUnprocessable();
    }

    public function test_driver_can_ping_location()
    {
        $this->withoutMiddleware();
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
            'school_id' => $bus->school_id,
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

    public function test_driver_status_update_does_not_write_presence_for_completed_trip()
    {
        [$driver, $bus, $student] = $this->createDriverData();

        $trip = Trip::create([
            'school_id' => $bus->school_id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'completed',
            'trip_date' => now(),
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/students/{$student->id}/status", [
            'busId' => $bus->id,
            'status' => 'absent',
        ])->assertOk();

        $this->assertDatabaseMissing('presences', [
            'trip_id' => $trip->id,
            'student_id' => $student->id,
            'status' => 'absent',
        ]);
    }

    public function test_parent_absence_does_not_write_presence_for_completed_trip()
    {
        [$driver, $bus, $student] = $this->createDriverData();
        $parent = $student->parent()->first();

        $trip = Trip::create([
            'school_id' => $bus->school_id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'type' => 'aller',
            'status' => 'completed',
            'trip_date' => now(),
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $this->actingAs($parent, 'sanctum')->postJson('/api/parent/absence', [
            'studentId' => $student->id,
        ])->assertOk();

        $this->assertDatabaseMissing('presences', [
            'trip_id' => $trip->id,
            'student_id' => $student->id,
            'status' => 'absent',
        ]);
    }

    public function test_parent_ready_persists_without_active_trip()
    {
        [, , $student] = $this->createDriverData();
        $parent = $student->parent()->first();

        $this->actingAs($parent, 'sanctum')->postJson('/api/parent/ready', [
            'studentId' => $student->id,
        ])->assertOk();

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'status' => 'ready',
        ]);
    }
}
