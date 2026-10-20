<?php

namespace Tests\Feature;

use App\Exceptions\FirebaseRequestException;
use App\Jobs\RetryFirebaseProjection;
use App\Models\FirebaseSyncFailure;
use App\Models\School;
use App\Models\User;
use App\Services\FirebaseMembershipSynchronizer;
use App\Services\FirebaseService;
use App\Services\EmulatorMembershipProjectionWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class FirebaseMembershipSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_firebase_membership_projection_defaults_to_kreait_driver(): void
    {
        $this->assertSame('kreait', config('services.firebase.sync_driver'));
    }

    public function test_emulator_membership_writer_rejects_https_urls(): void
    {
        config([
            'services.firebase.sync_driver' => 'emulator',
            'services.firebase.database_url' => 'https://demo-bustracker.firebaseio.com',
            'services.firebase.database_emulator_host' => '127.0.0.1:9000',
        ]);
        $this->expectException(\RuntimeException::class);
        new EmulatorMembershipProjectionWriter;
    }

    public function test_emulator_membership_writer_rejects_production_and_staging(): void
    {
        config([
            'services.firebase.database_url' => 'http://127.0.0.1:9000',
            'services.firebase.database_emulator_host' => '127.0.0.1:9000',
        ]);
        $originalEnvironment = app()->environment();

        foreach (['production', 'staging'] as $environment) {
            app()->instance('env', $environment);
            try {
                new EmulatorMembershipProjectionWriter;
                $this->fail("The emulator writer was allowed in {$environment}.");
            } catch (\RuntimeException $exception) {
                $this->assertStringNotContainsString('owner', $exception->getMessage());
            }
        }

        app()->instance('env', $originalEnvironment);
    }

    public function test_emulator_membership_writer_rejects_non_loopback_hosts(): void
    {
        config([
            'services.firebase.sync_driver' => 'emulator',
            'services.firebase.database_url' => 'http://127.0.0.1:9000',
            'services.firebase.database_emulator_host' => '8.8.8.8:9000',
        ]);
        $this->expectException(\RuntimeException::class);
        new EmulatorMembershipProjectionWriter;
    }

    public function test_emulator_writer_reports_safe_testing_readback_diagnostic(): void
    {
        config([
            'services.firebase.database_url' => 'http://127.0.0.1:9000',
            'services.firebase.database_emulator_host' => '127.0.0.1:9000',
            'services.firebase.emulator_token' => 'owner',
            'services.firebase.project_id' => 'demo-bustracker',
        ]);
        Http::fake([
            'http://127.0.0.1:9000/*' => Http::sequence()
                ->push(null, 200)
                ->push([
                    'active' => false,
                    'role' => 'parent',
                    'allowedBusIds' => ['busA' => true],
                ], 200),
        ]);

        $writer = new EmulatorMembershipProjectionWriter;
        $writer->deactivate(1, 7, [
            'active' => false,
            'role' => 'parent',
            'allowedBusIds' => (object) [],
        ]);

        $diagnostic = $writer->lastDiagnostic();

        $this->assertSame('demo-bustracker', $diagnostic['project_id']);
        $this->assertSame('demo-bustracker-default-rtdb', $diagnostic['namespace']);
        $this->assertSame('school_users/1/7', $diagnostic['membership_path']);
        $this->assertFalse($diagnostic['desired_active']);
        $this->assertFalse($diagnostic['read_back_active']);
        $this->assertSame(['busA'], $diagnostic['read_back_allowed_bus_keys']);
        $this->assertArrayNotHasKey('token', $diagnostic);
        $this->assertArrayNotHasKey('authorization', $diagnostic);
        Http::assertSentCount(2);
    }

    public function test_sql_membership_state_is_pending_until_firebase_sync_succeeds(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $failure = app(FirebaseMembershipSynchronizer::class)->enqueue($user);

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('syncUserMembership')->once()->withArgs(fn (User $member) => $member->id === $user->id);
        (new RetryFirebaseProjection($failure->id))->handle($firebase);

        $failure->refresh();
        $this->assertSame('synced', $failure->status);
        $this->assertNotNull($failure->last_successful_sync_at);
        $this->assertSame(1, $failure->attempts);
    }

    public function test_firebase_failure_is_recorded_without_false_synced_state(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $failure = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('syncUserMembership')->once()->andThrow(new FirebaseRequestException('Firebase unavailable'));

        try {
            (new RetryFirebaseProjection($failure->id))->handle($firebase);
        } catch (FirebaseRequestException) {
            // The queue must receive the exception for bounded retry handling.
        }

        $failure->refresh();
        $this->assertSame('failed', $failure->status);
        $this->assertNull($failure->completed_at);
        $this->assertSame('Firebase unavailable', $failure->last_error);
        $this->assertNotNull($failure->next_retry_at);
    }

    public function test_due_membership_sync_is_redispatched_after_process_interruption(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $failure = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        Queue::fake();

        $count = app(FirebaseMembershipSynchronizer::class)->dispatchDue();

        $this->assertSame(1, $count);
        Queue::assertPushed(RetryFirebaseProjection::class, fn (RetryFirebaseProjection $job) => $job->failureId === $failure->id);
        $this->assertTrue($failure->fresh()->next_retry_at->isFuture());
    }

    public function test_repeated_firebase_failures_keep_retry_metadata_and_never_sync(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $failure = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('syncUserMembership')->twice()->andThrow(new FirebaseRequestException('Firebase unavailable'));
        $job = new RetryFirebaseProjection($failure->id);

        foreach (range(1, 2) as $attempt) {
            try {
                $job->handle($firebase);
            } catch (FirebaseRequestException) {
            }
        }

        $failure->refresh();
        $this->assertSame(2, $failure->attempts);
        $this->assertSame('failed', $failure->status);
        $this->assertNull($failure->completed_at);
        $this->assertNotNull($failure->next_retry_at);
        $this->assertSame('Firebase unavailable', $failure->last_error);
    }

    public function test_repeated_retry_after_success_is_idempotent(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $failure = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('syncUserMembership')->once();
        $job = new RetryFirebaseProjection($failure->id);
        $job->handle($firebase);
        $job->handle($firebase);

        $this->assertSame(1, $failure->fresh()->attempts);
    }

    public function test_new_membership_state_supersedes_an_old_pending_operation(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $old = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        $user->update(['status' => 'disabled']);
        $new = app(FirebaseMembershipSynchronizer::class)->enqueue($user);

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('deactivateUserMembership')->once()->with($school->id, $user->id, 'admin');
        (new RetryFirebaseProjection($old->id))->handle($firebase);
        (new RetryFirebaseProjection($new->id))->handle($firebase);

        $this->assertNotNull($old->fresh()->superseded_at);
        $this->assertSame('synced', $new->fresh()->status);
    }

    public function test_pending_active_membership_is_revoked_when_user_is_disabled_or_school_suspended(): void
    {
        Queue::fake();
        $school = $this->school();
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $userPending = app(FirebaseMembershipSynchronizer::class)->enqueue($user);
        $user->update(['status' => 'disabled']);
        $school->update(['is_active' => false]);

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('deactivateUserMembership')->once()->with($school->id, $user->id, 'admin');
        (new RetryFirebaseProjection($userPending->id))->handle($firebase);

        $this->assertSame('synced', $userPending->fresh()->status);
    }

    public function test_transfer_revokes_old_school_and_syncs_new_school(): void
    {
        Queue::fake();
        $oldSchool = $this->school('old-school');
        $newSchool = $this->school('new-school');
        $user = User::factory()->create(['school_id' => $oldSchool->id, 'role' => 'admin', 'status' => 'active']);
        $old = app(FirebaseMembershipSynchronizer::class)->enqueueForSchool($user, $oldSchool->id, false, 'admin');
        $user->update(['school_id' => $newSchool->id]);
        $new = app(FirebaseMembershipSynchronizer::class)->enqueue($user);

        $firebase = Mockery::mock(FirebaseService::class);
        $firebase->shouldReceive('deactivateUserMembership')->once()->with($oldSchool->id, $user->id, 'admin');
        $firebase->shouldReceive('syncUserMembership')->once()->withArgs(fn (User $member) => $member->school_id === $newSchool->id);
        (new RetryFirebaseProjection($old->id))->handle($firebase);
        (new RetryFirebaseProjection($new->id))->handle($firebase);

        $this->assertSame('synced', $old->fresh()->status);
        $this->assertSame('synced', $new->fresh()->status);
    }

    public function test_only_super_admin_can_view_and_manually_retry_membership_syncs(): void
    {
        Queue::fake();
        $school = $this->school();
        $admin = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $sync = FirebaseSyncFailure::create([
            'operation' => 'membership_sync',
            'context' => ['user_id' => $admin->id, 'school_id' => $school->id],
            'user_id' => $admin->id,
            'school_id' => $school->id,
            'desired_active' => true,
            'desired_role' => 'admin',
            'desired_state' => ['user_id' => $admin->id, 'school_id' => $school->id, 'role' => 'admin', 'active' => true],
            'status' => 'failed',
            'last_error' => 'Unavailable',
        ]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/super-admin/firebase-syncs')->assertForbidden();
        $superAdmin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/super-admin/firebase-syncs?status=failed')
            ->assertOk()
            ->assertJsonPath('data.0.id', $sync->id);
        $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/super-admin/firebase-syncs/'.$sync->id.'/retry')
            ->assertAccepted()
            ->assertJsonPath('sync.status', 'pending');
        Queue::assertPushed(RetryFirebaseProjection::class);
    }

    private function school(string $subdomain = 'test-school'): School
    {
        return School::create([
            'name' => ucfirst(str_replace('-', ' ', $subdomain)),
            'subdomain' => $subdomain,
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);
    }
}
