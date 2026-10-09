<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register()
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password',
            'phone' => '1234567890',
            'role' => 'parent',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => [
                    'id', 'name', 'email', 'role', 'status'
                ]
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'role' => 'parent',
            'status' => 'active',
        ]);
    }

    public function test_registration_fails_with_duplicate_email()
    {
        User::factory()->create([
            'email' => 'john@example.com',
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login_with_correct_credentials()
    {
        $user = User::factory()->create([
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
            'role' => 'parent',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user',
            ]);
    }

    public function test_login_fails_with_incorrect_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Incorrect email or password.']);
    }

    public function test_login_fails_with_mismatched_role()
    {
        $user = User::factory()->create([
            'password' => Hash::make('password123'),
            'role' => 'driver',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
            'role' => 'parent',
        ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'This account does not match the selected role.']);
    }

    public function test_login_fails_for_inactive_account()
    {
        $user = User::factory()->create([
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'inactive',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
            'role' => 'parent',
        ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'This account is disabled.']);
    }

    public function test_user_can_get_their_profile()
    {
        $user = User::factory()->create([
            'role' => 'parent',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_user_can_logout()
    {
        $user = User::factory()->create();
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Logged out.']);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
    }
}
