<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            if (!Schema::hasColumn('schools', 'stripe_customer_id')) {
                $table->string('stripe_customer_id')->nullable()->after('subscription_status');
            }
            if (!Schema::hasColumn('schools', 'stripe_subscription_id')) {
                $table->string('stripe_subscription_id')->nullable()->after('stripe_customer_id');
            }
            if (!Schema::hasColumn('schools', 'stripe_price_id')) {
                $table->string('stripe_price_id')->nullable()->after('stripe_subscription_id');
            }
            if (!Schema::hasColumn('schools', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable()->after('stripe_price_id');
            }
            if (!Schema::hasColumn('schools', 'subscription_ends_at')) {
                $table->timestamp('subscription_ends_at')->nullable()->after('trial_ends_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            foreach (['subscription_ends_at', 'trial_ends_at', 'stripe_price_id', 'stripe_subscription_id', 'stripe_customer_id'] as $column) {
                if (Schema::hasColumn('schools', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
