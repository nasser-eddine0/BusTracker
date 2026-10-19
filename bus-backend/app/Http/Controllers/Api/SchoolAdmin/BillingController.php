<?php

namespace App\Http\Controllers\Api\SchoolAdmin;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Stripe\StripeClient;

class BillingController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $school = $this->schoolFor($request);

        return response()->json([
            'school' => $this->serializeSchool($school),
            'plans' => array_values($this->plans()),
        ]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $school = $this->schoolFor($request);

        $validated = $request->validate([
            'plan_id' => ['required', Rule::in(array_keys($this->plans()))],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],
        ]);

        $plan = $this->plans()[$validated['plan_id']];
        $stripe = new StripeClient(config('services.stripe.secret'));
        $customerId = $this->ensureStripeCustomer($stripe, $school, $request->user()->email);

        $session = $stripe->checkout->sessions->create([
            'mode' => 'subscription',
            'customer' => $customerId,
            'success_url' => $validated['success_url'],
            'cancel_url' => $validated['cancel_url'],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => 'usd',
                    'unit_amount' => $plan['amount_cents'],
                    'recurring' => ['interval' => 'month'],
                    'product_data' => [
                        'name' => $plan['name'],
                        'description' => $plan['description'],
                    ],
                ],
            ]],
            'metadata' => [
                'school_id' => (string) $school->id,
                'plan_id' => $validated['plan_id'],
            ],
            'subscription_data' => [
                'metadata' => [
                    'school_id' => (string) $school->id,
                    'plan_id' => $validated['plan_id'],
                    'max_buses' => (string) $plan['max_buses'],
                ],
            ],
        ]);

        return response()->json([
            'checkout_url' => $session->url,
        ]);
    }

    public function portal(Request $request): JsonResponse
    {
        $school = $this->schoolFor($request);

        abort_if(!$school->stripe_customer_id, 422, 'No Stripe customer exists for this school yet.');

        $validated = $request->validate([
            'return_url' => ['required', 'url'],
        ]);

        $stripe = new StripeClient(config('services.stripe.secret'));
        $session = $stripe->billingPortal->sessions->create([
            'customer' => $school->stripe_customer_id,
            'return_url' => $validated['return_url'],
        ]);

        return response()->json([
            'portal_url' => $session->url,
        ]);
    }

    public function plans(): array
    {
        return [
            'starter' => [
                'id' => 'starter',
                'name' => 'Starter',
                'description' => 'Starter monthly plan for small school fleets.',
                'amount_cents' => 2900,
                'price' => '$29',
                'max_buses' => 5,
            ],
            'pro' => [
                'id' => 'pro',
                'name' => 'Pro',
                'description' => 'Pro monthly plan for growing transport operations.',
                'amount_cents' => 7900,
                'price' => '$79',
                'max_buses' => 20,
            ],
            'enterprise' => [
                'id' => 'enterprise',
                'name' => 'Enterprise',
                'description' => 'Enterprise monthly plan with unlimited fleet capacity.',
                'amount_cents' => 19900,
                'price' => '$199',
                'max_buses' => 10000,
            ],
        ];
    }

    private function ensureStripeCustomer(StripeClient $stripe, School $school, ?string $email): string
    {
        if ($school->stripe_customer_id) {
            return $school->stripe_customer_id;
        }

        $customer = $stripe->customers->create([
            'name' => $school->name,
            'email' => $email,
            'metadata' => [
                'school_id' => (string) $school->id,
            ],
        ]);

        $school->update(['stripe_customer_id' => $customer->id]);

        return $customer->id;
    }

    private function schoolFor(Request $request): School
    {
        $school = $request->user()?->school;

        abort_if(!$school, 403, 'This account is not assigned to a school.');

        return $school;
    }

    private function serializeSchool(School $school): array
    {
        return [
            'id' => (string) $school->id,
            'name' => $school->name,
            'subscription_status' => $school->subscription_status ?? 'inactive',
            'max_buses' => (int) $school->max_buses,
            'active_buses' => Bus::query()->where('school_id', $school->id)->count(),
            'stripe_customer_id' => $school->stripe_customer_id,
            'stripe_subscription_id' => $school->stripe_subscription_id,
            'stripe_price_id' => $school->stripe_price_id,
            'trial_ends_at' => optional($school->trial_ends_at)->toIso8601String(),
            'subscription_ends_at' => optional($school->subscription_ends_at)->toIso8601String(),
            'is_subscribed' => $school->isSubscribed(),
            'is_on_trial' => $school->isOnTrial(),
            'is_on_grace_period' => $school->isOnGracePeriod(),
            'has_expired' => $school->hasExpired(),
        ];
    }
}
