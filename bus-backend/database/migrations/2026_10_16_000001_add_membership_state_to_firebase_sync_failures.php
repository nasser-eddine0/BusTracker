<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('firebase_sync_failures', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->foreignId('school_id')->nullable()->after('user_id')->constrained('schools')->nullOnDelete();
            $table->boolean('desired_active')->nullable()->after('context');
            $table->string('desired_role')->nullable()->after('desired_active');
            $table->json('desired_state')->nullable()->after('desired_role');
            $table->string('status')->default('pending')->after('desired_state');
            $table->timestamp('last_attempt_at')->nullable()->after('attempts');
            $table->timestamp('last_successful_sync_at')->nullable()->after('last_attempt_at');
            $table->timestamp('next_retry_at')->nullable()->after('last_successful_sync_at');
            $table->string('membership_key')->nullable()->after('next_retry_at');
            $table->timestamp('superseded_at')->nullable()->after('completed_at');

            $table->index(['status', 'next_retry_at']);
            $table->index(['membership_key', 'superseded_at']);
        });
    }

    public function down(): void
    {
        Schema::table('firebase_sync_failures', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['school_id']);
            $table->dropIndex(['status', 'next_retry_at']);
            $table->dropIndex(['membership_key', 'superseded_at']);
            $table->dropColumn([
                'user_id', 'school_id', 'desired_active', 'desired_role', 'desired_state',
                'status', 'last_attempt_at', 'last_successful_sync_at', 'next_retry_at',
                'membership_key', 'superseded_at',
            ]);
        });
    }
};
