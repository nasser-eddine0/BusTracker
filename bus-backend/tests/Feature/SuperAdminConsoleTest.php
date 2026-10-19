<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Bus;
use App\Models\FirebaseSyncFailure;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\FirebaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Kreait\Firebase\Contract\Database;
use Kreait\Firebase\Database\Reference;
use Mockery;
use Tests\TestCase;

class SuperAdminConsoleTest extends TestCase
{
    use RefreshDatabase;

    private function platformUser(): User
    {
        return User::factory()->create(['role' => 'super_admin', 'status' => 'active', 'password' => 'CurrentPassword123']);
    }

    public function test_school_list_returns_real_usage_and_firebase_sync_summary(): void
    {
        $school = School::create(['name' => 'Usage school', 'subdomain' => 'usage-school', 'max_buses' => 5]);
        User::factory()->count(2)->create(['school_id' => $school->id, 'role' => 'parent', 'status' => 'active']);
        User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $bus = Bus::create(['school_id' => $school->id, 'bus_name' => 'Bus 1', 'plate_number' => '123-A-1', 'capacity' => 20]);
        Student::create(['school_id' => $school->id, 'full_name' => 'Student 1', 'reg_code' => 'USAGE-1', 'bus_id' => $bus->id]);
        FirebaseSyncFailure::create([
            'operation' => 'membership_sync', 'school_id' => $school->id, 'status' => 'failed',
            'membership_key' => 'school:'.$school->id.':user:999', 'context' => [], 'last_error' => 'provider unavailable',
        ]);

        $this->actingAs($this->platformUser(), 'sanctum')
            ->getJson('/api/super-admin/schools')
            ->assertOk()
            ->assertJsonPath('schools.0.user_count', 3)
            ->assertJsonPath('schools.0.admin_count', 1)
            ->assertJsonPath('schools.0.student_count', 1)
            ->assertJsonPath('schools.0.bus_count', 1)
            ->assertJsonPath('schools.0.firebase_sync.failed', 1)
            ->assertJsonPath('schools.0.firebase_sync.status', 'failed');
    }

    public function test_every_console_route_rejects_non_super_admins_and_disabled_accounts(): void
    {
        $school = School::create(['name' => 'Test school', 'subdomain' => 'test-school', 'max_buses' => 5]);
        foreach (['admin', 'parent', 'driver', 'super_admin'] as $role) {
            $user = User::factory()->create(['role' => $role, 'school_id' => $school->id, 'status' => $role === 'super_admin' ? 'disabled' : 'active']);
            $this->actingAs($user, 'sanctum');
            foreach ([
                ['GET', 'schools'], ['POST', 'schools'], ['PUT', "schools/{$school->id}"],
                ['PATCH', "schools/{$school->id}/toggle-status"], ['POST', "schools/{$school->id}/admins"],
                ['GET', 'admins'], ['PUT', "admins/{$user->id}"], ['DELETE', "admins/{$user->id}"], ['GET', 'audit-logs'],
                ['GET', 'account'], ['PUT', 'account'], ['PUT', 'account/password'],
                ['GET', 'account/sessions'], ['DELETE', 'account/sessions/999'],
            ] as [$method, $path]) {
                $this->json($method, "/api/super-admin/{$path}")->assertForbidden();
            }
        }
    }

    public function test_profile_requires_current_password_and_cannot_change_authority(): void
    {
        $user = $this->platformUser();
        $this->actingAs($user, 'sanctum');
        $payload = ['name' => 'Updated name', 'email' => 'UPDATED@example.com', 'phone' => null, 'role' => 'parent', 'school_id' => 123];
        $this->putJson('/api/super-admin/account', $payload + ['current_password' => 'wrong'])->assertUnprocessable();
        $this->putJson('/api/super-admin/account', $payload + ['current_password' => 'CurrentPassword123'])
            ->assertOk()->assertJsonPath('account.email', 'updated@example.com');
        $this->getJson('/api/super-admin/account')->assertOk()->assertJsonPath('account.name', 'Updated name');
        $this->assertSame('super_admin', $user->fresh()->role);
        $this->assertNull($user->fresh()->school_id);
        $log = AuditLog::where('action', 'super_admin_profile_updated')->firstOrFail();
        $this->assertArrayNotHasKey('current_password', $log->new_values);
    }

    public function test_password_change_retains_current_token_and_revokes_only_own_other_tokens(): void
    {
        $user = $this->platformUser();
        $current = $user->createToken('current');
        $other = $user->createToken('other');
        $foreign = $this->platformUser()->createToken('foreign');
        $this->withToken($current->plainTextToken)->putJson('/api/super-admin/account/password', [
            'current_password' => 'CurrentPassword123', 'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123',
        ])->assertOk();
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $foreign->accessToken->id]);
        $log = AuditLog::where('action', 'super_admin_password_changed')->firstOrFail();
        $this->assertNull($log->new_values);
        $this->assertNull($log->old_values);
    }

    public function test_sessions_never_expose_tokens_and_cannot_revoke_other_accounts_or_current_token(): void
    {
        $user = $this->platformUser();
        $current = $user->createToken('current');
        $other = $user->createToken('other');
        $foreign = $this->platformUser()->createToken('foreign');
        $this->withToken($current->plainTextToken);
        $response = $this->getJson('/api/super-admin/account/sessions')->assertOk()->assertJsonCount(2, 'sessions');
        $this->assertArrayNotHasKey('token', $response->json('sessions.0'));
        $this->deleteJson('/api/super-admin/account/sessions/'.$foreign->accessToken->id)->assertNotFound();
        $this->deleteJson('/api/super-admin/account/sessions/'.$current->accessToken->id)->assertUnprocessable();
        $this->deleteJson('/api/super-admin/account/sessions/'.$other->accessToken->id)->assertOk();
        $this->deleteJson('/api/super-admin/account/sessions/'.$other->accessToken->id)->assertNotFound();
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $foreign->accessToken->id]);
    }

    public function test_super_admin_can_soft_delete_admin_with_revocation_and_audit(): void
    {
        Queue::fake();
        $school = School::create(['name' => 'Delete school', 'subdomain' => 'delete-school', 'max_buses' => 5]);
        $admin = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $token = $admin->createToken('admin-device');

        $this->actingAs($this->platformUser(), 'sanctum')
            ->deleteJson('/api/super-admin/admins/'.$admin->id)
            ->assertOk();

        $this->assertSoftDeleted('users', ['id' => $admin->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseHas('firebase_sync_failures', [
            'operation' => 'membership_sync', 'user_id' => $admin->id, 'school_id' => $school->id,
            'desired_active' => false, 'status' => 'pending',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'school_admin_deleted', 'school_id' => $school->id]);
    }

    public function test_last_active_super_admin_cannot_be_deleted(): void
    {
        $superAdmin = $this->platformUser();

        $this->actingAs($superAdmin, 'sanctum')
            ->deleteJson('/api/super-admin/admins/'.$superAdmin->id)
            ->assertUnprocessable();

        $this->assertDatabaseHas('users', ['id' => $superAdmin->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'super_admin_change_rejected']);
    }

    public function test_failed_audit_rolls_back_school_creation(): void
    {
        $this->actingAs($this->platformUser(), 'sanctum');
        $audit = Mockery::mock(AuditLogger::class);
        $audit->shouldReceive('log')->once()->andThrow(new \RuntimeException('Test failure'));
        $this->app->instance(AuditLogger::class, $audit);
        $this->postJson('/api/super-admin/schools', ['name' => 'Rollback', 'subdomain' => 'rollback', 'max_buses' => 5])->assertStatus(500);
        $this->assertDatabaseMissing('schools', ['subdomain' => 'rollback']);
    }

    public function test_audit_failure_rolls_back_school_suspension_without_touching_firebase(): void
    {
        $school = School::create(['name' => 'Rollback', 'subdomain' => 'rollback-suspend', 'max_buses' => 5, 'is_active' => true]);
        $this->mock(FirebaseService::class, function ($mock) {
            $mock->shouldNotReceive('revokeSchoolMemberships');
        });
        $audit = Mockery::mock(AuditLogger::class);
        $audit->shouldReceive('log')->once()->andThrow(new \RuntimeException('Audit unavailable'));
        $this->app->instance(AuditLogger::class, $audit);
        $this->actingAs($this->platformUser(), 'sanctum')
            ->patchJson('/api/super-admin/schools/'.$school->id.'/toggle-status', ['is_active' => false])
            ->assertStatus(500);
        $this->assertTrue($school->fresh()->is_active);
        $this->assertDatabaseMissing('firebase_sync_failures', ['operation' => 'membership_sync']);
    }

    public function test_school_admin_changes_are_audited_and_revoke_existing_tokens(): void
    {
        $this->mock(FirebaseService::class, function ($mock) {
            $mock->shouldNotReceive('syncUserMembership');
            $mock->shouldNotReceive('deactivateUserMembership');
        });
        $school = School::create(['name' => 'Test', 'subdomain' => 'test', 'max_buses' => 5]);
        $admin = User::factory()->create(['role' => 'admin', 'school_id' => $school->id]);
        $token = $admin->createToken('old');
        $this->actingAs($this->platformUser(), 'sanctum')->putJson('/api/super-admin/admins/'.$admin->id, [
            'name' => 'Updated admin', 'email' => $admin->email, 'password' => 'NewPassword123', 'status' => 'active',
        ])->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $log = AuditLog::where('action', 'school_admin_updated')->firstOrFail();
        $this->assertSame('Updated admin', $log->new_values['name']);
        $this->assertArrayNotHasKey('password', $log->new_values);
    }

    public function test_invalid_audit_date_range_and_ambiguous_school_toggle_are_rejected(): void
    {
        $school = School::create(['name' => 'Test', 'subdomain' => 'test', 'max_buses' => 5]);
        $this->actingAs($this->platformUser(), 'sanctum');
        $this->getJson('/api/super-admin/audit-logs?date_from=2026-10-15&date_to=2026-10-14')
            ->assertUnprocessable()->assertJsonValidationErrors('date_to');
        $this->patchJson('/api/super-admin/schools/'.$school->id.'/toggle-status', [])->assertUnprocessable();
        $this->patchJson('/api/super-admin/schools/'.$school->id.'/toggle-status', ['is_active' => false])->assertOk();
        $this->patchJson('/api/super-admin/schools/'.$school->id.'/toggle-status', ['is_active' => false])->assertOk();
        $this->assertFalse($school->fresh()->is_active);
        $this->assertSame(1, AuditLog::where('action', 'school_suspended')->count());
    }

    public function test_firebase_failure_leaves_committed_sql_state_and_durable_retry_record(): void
    {
        $old = School::create(['name' => 'Old', 'subdomain' => 'old', 'max_buses' => 5, 'is_active' => true]);
        $new = School::create(['name' => 'New', 'subdomain' => 'new', 'max_buses' => 5]);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'school_id' => $old->id]);
        $token = $admin->createToken('existing');
        $this->mock(FirebaseService::class, function ($mock) {
            $mock->shouldReceive('deactivateUserMembership')->once()->andThrow(new \RuntimeException('Provider unavailable'));
        });
        $this->actingAs($this->platformUser(), 'sanctum');
        $this->patchJson('/api/super-admin/schools/'.$old->id.'/toggle-status', ['is_active' => false])->assertOk();
        $this->assertFalse($old->fresh()->is_active);
        $this->assertSame(1, FirebaseSyncFailure::where('operation', 'membership_sync')->where('status', 'failed')->count());
        $this->assertSame($old->id, $admin->fresh()->school_id);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'school_suspended',
            'school_id' => $old->id,
        ]);
    }

    public function test_transfer_revokes_old_membership_and_returns_new_school(): void
    {
        $old = School::create(['name' => 'Old', 'subdomain' => 'old', 'max_buses' => 5]);
        $new = School::create(['name' => 'New', 'subdomain' => 'new', 'max_buses' => 5]);
        $admin = User::factory()->create(['role' => 'admin', 'school_id' => $old->id]);
        $this->mock(FirebaseService::class, function ($mock) use ($old, $new, $admin) {
            $mock->shouldReceive('deactivateUserMembership')->once()->withArgs(fn ($schoolId, $userId) => $schoolId === $old->id && $userId === $admin->id);
            $mock->shouldReceive('syncUserMembership')->once()->withArgs(fn ($member) => $member->id === $admin->id && $member->school_id === $new->id);
        });
        $this->actingAs($this->platformUser(), 'sanctum')->putJson('/api/super-admin/admins/'.$admin->id, [
            'name' => $admin->name, 'email' => $admin->email, 'status' => 'active', 'school_id' => $new->id,
        ])->assertOk()->assertJsonPath('admin.school.id', (string) $new->id);
    }

    public function test_last_active_super_admin_cannot_be_disabled_and_rejection_is_audited(): void
    {
        $superAdmin = $this->platformUser();

        $this->actingAs($superAdmin, 'sanctum')
            ->putJson('/api/super-admin/admins/'.$superAdmin->id, [
                'name' => $superAdmin->name,
                'email' => $superAdmin->email,
                'status' => 'disabled',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'You cannot disable or demote your current Super Admin account.');

        $this->assertSame('active', $superAdmin->fresh()->status);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'super_admin_change_rejected',
            'auditable_id' => $superAdmin->id,
        ]);
    }

    public function test_current_super_admin_cannot_be_demoted_even_when_another_exists(): void
    {
        $current = $this->platformUser();
        $school = School::create(['name' => 'Target school', 'subdomain' => 'target-school', 'max_buses' => 5]);
        User::factory()->create(['role' => 'super_admin', 'status' => 'active']);

        $this->actingAs($current, 'sanctum')
            ->putJson('/api/super-admin/admins/'.$current->id, [
                'name' => $current->name,
                'email' => $current->email,
                'role' => 'admin',
                'school_id' => $school->id,
                'status' => 'active',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'You cannot disable or demote your current Super Admin account.');

        $this->assertSame('super_admin', $current->fresh()->role);
        $this->assertSame('active', $current->fresh()->status);
        $this->assertSame(1, AuditLog::where('action', 'super_admin_change_rejected')->count());
    }

    public function test_school_admin_cannot_be_moved_without_a_school(): void
    {
        $school = School::create(['name' => 'School', 'subdomain' => 'school', 'max_buses' => 5]);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'school_id' => $school->id]);

        $this->actingAs($this->platformUser(), 'sanctum')
            ->putJson('/api/super-admin/admins/'.$admin->id, [
                'name' => $admin->name,
                'email' => $admin->email,
                'school_id' => null,
                'status' => 'active',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'School administrators must belong to a school.');

        $this->assertSame($school->id, $admin->fresh()->school_id);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'super_admin_change_rejected',
            'auditable_id' => $admin->id,
        ]);
    }

    public function test_membership_refresh_uses_current_account_and_school_eligibility(): void
    {
        $school = School::create(['name' => 'Test', 'subdomain' => 'test', 'max_buses' => 5, 'is_active' => true, 'subscription_status' => 'active']);
        $user = User::factory()->create(['school_id' => $school->id, 'role' => 'admin', 'status' => 'active']);
        $writes = [];
        $reference = Mockery::mock(Reference::class);
        $reference->shouldReceive('set')->andReturnUsing(function ($payload) use (&$writes, $reference) {
            $writes[] = $payload;

            return $reference;
        });
        $database = Mockery::mock(Database::class);
        $database->shouldReceive('getReference')->with("school_users/{$school->id}/{$user->id}")->andReturn($reference);
        $reflection = new \ReflectionClass(FirebaseService::class);
        $service = $reflection->newInstanceWithoutConstructor();
        $reflection->getProperty('database')->setValue($service, $database);
        $service->syncUserMembership($user);
        $this->assertTrue($writes[0]['active']);
        $school->update(['is_active' => false]);
        $service->syncUserMembership($user, true);
        $this->assertFalse($writes[1]['active']);
        $school->update(['is_active' => true]);
        User::whereKey($user->id)->update(['status' => 'disabled']);
        $service->syncUserMembership($user);
        $this->assertFalse($writes[2]['active']);
        User::whereKey($user->id)->update(['status' => 'active', 'deleted_at' => now()]);
        $service->syncUserMembership($user);
        $this->assertFalse($writes[3]['active']);
        User::withTrashed()->whereKey($user->id)->update(['school_id' => null]);
        $service->syncUserMembership($user);
        $this->assertCount(4, $writes);
    }
}
