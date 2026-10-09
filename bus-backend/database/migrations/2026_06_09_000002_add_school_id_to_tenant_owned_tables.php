<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['buses', 'students', 'trips', 'notifications', 'presences'] as $tableName) {
            if (!Schema::hasColumn($tableName, 'school_id')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->foreignId('school_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('schools')
                        ->cascadeOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['presences', 'notifications', 'trips', 'students', 'buses'] as $tableName) {
            if (Schema::hasColumn($tableName, 'school_id')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->dropConstrainedForeignId('school_id');
                });
            }
        }
    }
};
