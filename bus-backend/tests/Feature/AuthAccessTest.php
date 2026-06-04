<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_creates_parent_accounts_only(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Parent User',
            'email' => 'parent@example.com',
            'password' => 'password123',
            'role' => 'parent',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.role', 'parent')
            ->assertJsonStructure(['access_token', 'user' => ['id', 'name', 'email', 'role']]);

        $this->assertDatabaseHas('users', [
            'email' => 'parent@example.com',
            'role' => 'parent',
        ]);
    }

    public function test_public_registration_rejects_admin_role(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Fake Admin',
            'email' => 'fake-admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', [
            'email' => 'fake-admin@example.com',
        ]);
    }

    public function test_login_rejects_selected_role_that_does_not_match_account(): void
    {
        User::query()->create([
            'name' => 'Driver User',
            'email' => 'driver@example.com',
            'password' => Hash::make('password123'),
            'role' => 'driver',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'driver@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertForbidden();
    }

    public function test_parent_token_cannot_access_admin_routes(): void
    {
        $parent = User::query()->create([
            'name' => 'Parent User',
            'email' => 'parent-only@example.com',
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
        ]);

        $response = $this
            ->actingAs($parent, 'sanctum')
            ->getJson('/api/admin/bootstrap');

        $response->assertForbidden();
    }
}
