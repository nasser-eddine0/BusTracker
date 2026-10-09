<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $webhookSecret = config('services.stripe.webhook_secret');

        if (!$webhookSecret || !$signature) {
            return response()->json(['message' => 'Stripe webhook signature verification is required.'], 400);
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $webhookSecret);
        } catch (UnexpectedValueException|SignatureVerificationException) {
            return response()->json(['message' => 'Invalid Stripe webhook payload.'], 400);
        }

        $eventId = $event->id ?? null;
        $eventType = $event->type ?? null;

        if (!$eventId || !$eventType) {
            return response()->json(['message' => 'Invalid Stripe event envelope.'], 400);
        }

        $inserted = DB::table('stripe_webhook_logs')->insertOrIgnore([
            'stripe_event_id' => $eventId,
            'event_type' => $eventType,
            'status' => 'processing',
            'payload' => $payload,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted === 0) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        try {
            match ($eventType) {
                'customer.subscription.created',
                'customer.subscription.updated' => $this->syncSubscription($event->data->object),
                'customer.subscription.deleted' => $this->cancelSubscription($event->data->object),
                'invoice.payment_failed' => $this->markPaymentFailed($event->data->object),
                default => null,
            };

            DB::table('stripe_webhook_logs')
                ->where('stripe_event_id', $eventId)
                ->update([
                    'status' => 'processed',
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);
        } catch (\Throwable $exception) {
            DB::table('stripe_webhook_logs')
                ->where('stripe_event_id', $eventId)
                ->update([
                    'status' => 'failed',
                    'updated_at' => now(),
                ]);

            throw $exception;
        }

        return response()->json(['received' => true]);
    }

    private function syncSubscription(object $subscription): void
    {
        $school = $this->resolveSchool($subscription);
        if (!$school) {
            return;
        }

        $item = $subscription->items->data[0] ?? null;
        $priceId = $item?->price?->id ?? null;
        $maxBuses = (int) ($subscription->metadata->max_buses ?? $school->max_buses);
        $periodEnd = $subscription->current_period_end ?? null;
        $trialEnd = $subscription->trial_end ?? null;
        $cancelAtPeriodEnd = (bool) ($subscription->cancel_at_period_end ?? false);
        $oldValues = $this->subscriptionSnapshot($school);

        $school->update([
            'stripe_customer_id' => $subscription->customer ?? $school->stripe_customer_id,
            'stripe_subscription_id' => $subscription->id,
            'stripe_price_id' => $priceId,
            'subscription_status' => $subscription->status,
            'max_buses' => $maxBuses,
            'trial_ends_at' => $trialEnd ? Carbon::createFromTimestamp($trialEnd) : null,
            'subscription_ends_at' => $cancelAtPeriodEnd && $periodEnd ? Carbon::createFromTimestamp($periodEnd) : null,
        ]);

        $this->auditLogger->log([
            'action' => 'subscription_updated',
            'description' => "Subscription for school '{$school->name}' updated by Stripe",
            'auditable' => $school,
            'school_id' => $school->id,
            'old_values' => $oldValues,
            'new_values' => $this->subscriptionSnapshot($school->fresh()),
        ]);
    }

    private function cancelSubscription(object $subscription): void
    {
        $school = $this->resolveSchool($subscription);
        if (!$school) {
            return;
        }

        $periodEnd = $subscription->current_period_end ?? null;
        $oldValues = $this->subscriptionSnapshot($school);

        $school->update([
            'stripe_subscription_id' => $subscription->id,
            'subscription_status' => 'canceled',
            'subscription_ends_at' => $periodEnd ? Carbon::createFromTimestamp($periodEnd) : now(),
        ]);

        $this->auditLogger->log([
            'action' => 'subscription_canceled',
            'description' => "Subscription for school '{$school->name}' canceled by Stripe",
            'severity' => 'warning',
            'auditable' => $school,
            'school_id' => $school->id,
            'old_values' => $oldValues,
            'new_values' => $this->subscriptionSnapshot($school->fresh()),
        ]);
    }

    private function markPaymentFailed(object $invoice): void
    {
        $school = $this->resolveSchoolFromInvoice($invoice);
        if (!$school) {
            return;
        }

        $oldValues = $this->subscriptionSnapshot($school);

        $school->update([
            'subscription_status' => 'past_due',
        ]);

        $this->auditLogger->log([
            'action' => 'subscription_payment_failed',
            'description' => "Subscription payment failed for school '{$school->name}'",
            'severity' => 'critical',
            'auditable' => $school,
            'school_id' => $school->id,
            'old_values' => $oldValues,
            'new_values' => $this->subscriptionSnapshot($school->fresh()),
        ]);
    }

    private function resolveSchool(object $subscription): ?School
    {
        $schoolId = $subscription->metadata->school_id ?? null;
        if ($schoolId) {
            return School::find($schoolId);
        }

        $customerId = $subscription->customer ?? null;
        if ($customerId) {
            return School::where('stripe_customer_id', $customerId)->first();
        }

        return null;
    }

    private function resolveSchoolFromInvoice(object $invoice): ?School
    {
        $schoolId = $invoice->subscription_details->metadata->school_id
            ?? $invoice->metadata->school_id
            ?? null;

        if ($schoolId) {
            return School::find($schoolId);
        }

        $subscriptionId = $invoice->subscription ?? null;
        if ($subscriptionId) {
            $school = School::where('stripe_subscription_id', $subscriptionId)->first();
            if ($school) {
                return $school;
            }
        }

        $customerId = $invoice->customer ?? null;
        if ($customerId) {
            return School::where('stripe_customer_id', $customerId)->first();
        }

        return null;
    }

    private function subscriptionSnapshot(School $school): array
    {
        return [
            'subscription_status' => $school->subscription_status,
            'stripe_customer_id' => $school->stripe_customer_id,
            'stripe_subscription_id' => $school->stripe_subscription_id,
            'stripe_price_id' => $school->stripe_price_id,
            'max_buses' => $school->max_buses,
            'trial_ends_at' => optional($school->trial_ends_at)->toIso8601String(),
            'subscription_ends_at' => optional($school->subscription_ends_at)->toIso8601String(),
        ];
    }
}
