<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccountCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_school_admin_cannot_create_admin_accounts(): void
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
            'email' => 'tenant-admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', [
                'role' => 'admin',
                'name' => 'Blocked Admin',
                'email' => 'blocked-admin@example.com',
                'password' => 'password123',
                'status' => 'active',
            ])
            ->assertUnprocessable();

        $this->assertDatabaseMissing('users', [
            'email' => 'blocked-admin@example.com',
        ]);
    }

    public function test_super_admin_can_create_admin_account_for_school(): void
    {
        $school = School::create([
            'name' => 'Client School',
            'subdomain' => 'client-school',
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super-admin@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->actingAs($superAdmin, 'sanctum')
            ->postJson("/api/super-admin/schools/{$school->id}/admins", [
                'school_id' => $school->id,
                'name' => 'Client Admin',
                'email' => 'client-admin@example.com',
                'password' => 'password123',
                'phone' => '+212600000000',
            ])
            ->assertCreated()
            ->assertJsonPath('admin.role', 'admin')
            ->assertJsonPath('admin.school_id', (string) $school->id);

        $this->assertDatabaseHas('users', [
            'school_id' => $school->id,
            'email' => 'client-admin@example.com',
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_super_admin_can_list_and_update_all_admin_accounts(): void
    {
        $schoolOne = School::create([
            'name' => 'Alpha School',
            'subdomain' => 'alpha-school',
            'max_buses' => 3,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $schoolTwo = School::create([
            'name' => 'Beta School',
            'subdomain' => 'beta-school',
            'max_buses' => 4,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super-admin@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $adminOne = User::create([
            'school_id' => $schoolOne->id,
            'name' => 'Alpha Admin',
            'email' => 'alpha-admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
            'phone' => '+212600000001',
        ]);

        $adminTwo = User::create([
            'school_id' => $schoolTwo->id,
            'name' => 'Beta Admin',
            'email' => 'beta-admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
            'phone' => '+212600000002',
        ]);

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/super-admin/admins')
            ->assertOk()
            ->assertJsonCount(2, 'admins')
            ->assertJsonPath('admins.0.email', 'alpha-admin@example.com')
            ->assertJsonPath('admins.1.email', 'beta-admin@example.com');

        $this->actingAs($superAdmin, 'sanctum')
            ->putJson("/api/super-admin/admins/{$adminOne->id}", [
                'name' => 'Alpha Admin Updated',
                'email' => 'alpha-admin-updated@example.com',
                'phone' => '+212600000111',
                'password' => 'newPassword123',
                'role' => 'admin',
                'status' => 'disabled',
            ])
            ->assertOk()
            ->assertJsonPath('admin.name', 'Alpha Admin Updated')
            ->assertJsonPath('admin.email', 'alpha-admin-updated@example.com')
            ->assertJsonPath('admin.status', 'disabled');

        $this->assertDatabaseHas('users', [
            'id' => $adminOne->id,
            'name' => 'Alpha Admin Updated',
            'email' => 'alpha-admin-updated@example.com',
            'status' => 'disabled',
        ]);

        $this->assertTrue(
            
            
            password_verify('newPassword123', User::find($adminOne->id)->password)
        );
    }
}
