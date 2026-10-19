<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_simulated_chat_response_uses_current_project_stack(): void
    {
        config(['services.xai.key' => null]);

        $school = School::create([
            'name' => 'Test School',
            'subdomain' => 'chat-test',
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $user = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'school_id' => $school->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/chat', [
            'message' => 'Parle-moi de la base de donnees',
        ]);

        $response->assertOk()
            ->assertJsonPath('simulated', true);

        $reply = $response->json('reply');

        $this->assertStringContainsString('Laravel', $reply);
        $this->assertStringContainsString('Eloquent', $reply);
        $this->assertStringNotContainsString('Supabase', $reply);
        $this->assertStringNotContainsString('PostgreSQL', $reply);
        $this->assertStringNotContainsString('AWS', $reply);
        $this->assertStringNotContainsString('rapport_bus_tracker.md', $reply);
    }
}
