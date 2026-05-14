<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            if (!Schema::hasColumn('buses', 'route_name')) {
                $table->string('route_name')->nullable()->after('plate_number');
            }

            if (!Schema::hasColumn('buses', 'school_name')) {
                $table->string('school_name')->nullable()->after('route_name');
            }

            if (!Schema::hasColumn('buses', 'trip_status')) {
                $table->string('trip_status')->default('idle')->after('driver_id');
            }

            if (!Schema::hasColumn('buses', 'trip_started_at')) {
                $table->timestamp('trip_started_at')->nullable()->after('trip_status');
            }

            if (!Schema::hasColumn('buses', 'trip_completed_at')) {
                $table->timestamp('trip_completed_at')->nullable()->after('trip_started_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            foreach (['trip_completed_at', 'trip_started_at', 'trip_status', 'school_name', 'route_name'] as $column) {
                if (Schema::hasColumn('buses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
