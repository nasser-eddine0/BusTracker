<?php

namespace Tests\Feature;

use App\Models\School;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StripeWebhookSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_rejects_missing_signature(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test']);

        $this->postJson('/api/stripe/webhook', ['id' => 'evt_missing_signature'])
            ->assertStatus(400);
    }

    public function test_webhook_marks_failed_invoice_past_due_once(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test']);

        $school = School::create([
            'name' => 'Webhook School',
            'subdomain' => 'webhook-school',
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
            'stripe_customer_id' => 'cus_test',
            'stripe_subscription_id' => 'sub_test',
        ]);

        $payload = json_encode([
            'id' => 'evt_payment_failed_once',
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'customer' => 'cus_test',
                    'subscription' => 'sub_test',
                    'subscription_details' => [
                        'metadata' => [
                            'school_id' => (string) $school->id,
                        ],
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $server = [
            'HTTP_STRIPE_SIGNATURE' => $this->stripeSignature($payload, 'whsec_test'),
            'CONTENT_TYPE' => 'application/json',
        ];

        $this->call('POST', '/api/stripe/webhook', [], [], [], $server, $payload)->assertOk();
        $this->call('POST', '/api/stripe/webhook', [], [], [], $server, $payload)->assertOk()->assertJsonPath('duplicate', true);

        $this->assertSame('past_due', $school->fresh()->subscription_status);
        $this->assertSame(1, DB::table('stripe_webhook_logs')->where('stripe_event_id', 'evt_payment_failed_once')->count());
        $this->assertDatabaseHas('audit_logs', [
            'school_id' => $school->id,
            'action' => 'subscription_payment_failed',
            'severity' => 'critical',
        ]);
    }

    private function stripeSignature(string $payload, string $secret): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return "t={$timestamp},v1={$signature}";
    }
}
