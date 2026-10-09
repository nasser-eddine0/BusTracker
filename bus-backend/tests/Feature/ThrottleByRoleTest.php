<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ThrottleByRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Clear rate limiters before testing
        RateLimiter::clear('ip:127.0.0.1|POST|api/login');
    }

    public function test_throttle_blocks_too_many_requests()
    {
        $url = '/api/login';

        // The throttle limit is 5 per minute for this route group
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson($url, [
                'email' => 'test@example.com',
                'password' => 'password',
            ]);
            // It might return 401 Unauthorized because user doesn't exist, which is fine, we just care it is not 429 yet.
            $response->assertStatus(401);
        }

        // The 6th attempt should be blocked
        $response = $this->postJson($url, [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(429)
            ->assertJson(['message' => 'Too many requests. Please slow down.']);
    }
}
