<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_disabled_super_admin_cannot_read_or_modify_platform_data(): void
    {
        $user = User::factory()->create(['role' => 'super_admin', 'status' => 'disabled']);
        $this->actingAs($user, 'sanctum');
        $this->getJson('/api/super-admin/audit-logs')->assertForbidden();
        $this->getJson('/api/super-admin/schools')->assertForbidden();
        $this->getJson('/api/super-admin/admins')->assertForbidden();
        $this->postJson('/api/super-admin/schools', [
            'name' => 'Forbidden School', 'subdomain' => 'forbidden-school', 'max_buses' => 5,
        ])->assertForbidden();
        $this->assertDatabaseMissing('schools', ['subdomain' => 'forbidden-school']);
    }

    public function test_security_severity_filter_is_validated_and_applied(): void
    {
        $user = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        foreach (['info', 'warning', 'critical'] as $severity) {
            AuditLog::create([
                'user_id' => $user->id, 'action' => 'test_event',
                'description' => 'Synthetic test event', 'severity' => $severity,
            ]);
        }
        $this->actingAs($user, 'sanctum');
        $this->getJson('/api/super-admin/audit-logs?severity=critical')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.severity', 'critical');
        $this->getJson('/api/super-admin/audit-logs?severity=invalid')
            ->assertUnprocessable()->assertJsonValidationErrors('severity');
        $this->getJson('/api/super-admin/audit-logs')->assertOk()->assertJsonPath('total', 3);
    }

    public function test_super_admin_school_actions_are_audited(): void
    {
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super.audit@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $response = $this->actingAs($superAdmin, 'sanctum')->postJson('/api/super-admin/schools', [
            'name' => 'Audit School',
            'subdomain' => 'audit-school',
            'max_buses' => 5,
            'primary_color' => '#facc15',
        ]);

        $response->assertCreated();
        $schoolId = $response->json('school.id');

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $superAdmin->id,
            'school_id' => $schoolId,
            'action' => 'school_created',
        ]);

        $createdLog = AuditLog::where('action', 'school_created')->firstOrFail();
        $this->assertSame("School 'Audit School' created by Super Admin", $createdLog->description);
        $this->assertSame('Audit School', $createdLog->new_values['name']);

        $this->actingAs($superAdmin, 'sanctum')
            ->postJson("/api/super-admin/schools/{$schoolId}/admins", [
                'school_id' => $schoolId,
                'name' => 'Audit Admin',
                'email' => 'audit.admin@example.com',
                'password' => 'password123',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $superAdmin->id,
            'school_id' => $schoolId,
            'action' => 'school_admin_created',
        ]);
    }

    public function test_school_update_log_contains_old_and_new_values(): void
    {
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super.audit.update@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $school = School::create([
            'name' => 'Old School',
            'subdomain' => 'old-school',
            'max_buses' => 5,
            'is_active' => true,
        ]);

        $this->actingAs($superAdmin, 'sanctum')
            ->putJson("/api/super-admin/schools/{$school->id}", [
                'name' => 'New School',
                'subdomain' => 'new-school',
                'max_buses' => 12,
                'primary_color' => '#facc15',
            ])
            ->assertOk();

        $log = AuditLog::where('action', 'school_updated')->firstOrFail();

        $this->assertSame('Old School', $log->old_values['name']);
        $this->assertSame('New School', $log->new_values['name']);
        $this->assertSame(5, $log->old_values['max_buses']);
        $this->assertSame(12, $log->new_values['max_buses']);
    }

    public function test_only_super_admin_can_read_audit_logs(): void
    {
        $school = School::create([
            'name' => 'Tenant School',
            'subdomain' => 'tenant-school',
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $admin = User::create([
            'school_id' => $school->id,
            'name' => 'Tenant Admin',
            'email' => 'tenant.audit@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super.audit.reader@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        AuditLog::create([
            'user_id' => $superAdmin->id,
            'school_id' => $school->id,
            'action' => 'school_created',
            'description' => "School '{$school->name}' created by Super Admin",
            'new_values' => ['school_id' => $school->id],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/super-admin/audit-logs')
            ->assertForbidden();

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/super-admin/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'school_created');
    }

    public function test_audit_logs_can_be_filtered_and_paginated(): void
    {
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super.audit.pagination@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $school = School::create([
            'name' => 'Paged School',
            'subdomain' => 'paged-school',
            'max_buses' => 5,
            'is_active' => true,
        ]);

        for ($index = 1; $index <= 3; $index++) {
            AuditLog::create([
                'user_id' => $superAdmin->id,
                'school_id' => $school->id,
                'action' => $index === 3 ? 'school_suspended' : 'school_created',
                'severity' => $index === 3 ? 'warning' : 'info',
                'description' => "Audit log {$index}",
                'new_values' => ['index' => $index],
            ]);
        }

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson("/api/super-admin/audit-logs?school_id={$school->id}&user_id={$superAdmin->id}&action=school_created&limit=1&page=1&date_from=".now()->toDateString().'&date_to='.now()->toDateString())
            ->assertOk()
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.action', 'school_created');
    }
}
