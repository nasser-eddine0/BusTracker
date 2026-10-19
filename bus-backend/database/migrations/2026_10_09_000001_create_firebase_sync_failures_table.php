<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('firebase_sync_failures', function (Blueprint $table): void {
            $table->id();
            $table->string('operation');
            $table->json('context');
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['operation', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firebase_sync_failures');
    }
};
