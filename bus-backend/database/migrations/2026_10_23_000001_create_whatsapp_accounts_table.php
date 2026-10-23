<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->foreignId('school_id')->constrained('schools')->restrictOnDelete();
            $table->string('status', 40)->default('linked');
            $table->text('bsuid_encrypted')->nullable();
            $table->string('bsuid_hash', 64)->nullable()->unique();
            $table->string('bsuid_hash_key_version', 40)->nullable();
            $table->text('destination_e164_encrypted')->nullable();
            $table->string('destination_e164_hash', 64)->nullable()->unique();
            $table->string('destination_hash_key_version', 40)->nullable();
            $table->string('destination_last_four', 4)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('reverify_at')->nullable()->index();
            $table->timestamp('revoked_at')->nullable()->index();
            $table->string('revocation_reason', 120)->nullable();
            $table->string('link_consent_version', 40);
            $table->timestamp('consented_at');
            $table->timestamps();

            $table->index(['school_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_accounts');
    }
};
