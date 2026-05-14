<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('bus_id');
            }

            if (!Schema::hasColumn('students', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }

            if (!Schema::hasColumn('students', 'location_conformee')) {
                $table->boolean('location_conformee')->default(false)->after('longitude');
            }
        });

        if (Schema::hasColumn('students', 'home_lat') && Schema::hasColumn('students', 'home_lng')) {
            DB::table('students')
                ->whereNull('latitude')
                ->whereNull('longitude')
                ->update([
                    'latitude' => DB::raw('home_lat'),
                    'longitude' => DB::raw('home_lng'),
                ]);
        }

        Schema::table('buses', function (Blueprint $table) {
            if (!Schema::hasColumn('buses', 'latitude_actuelle')) {
                $table->decimal('latitude_actuelle', 10, 7)->nullable()->after('driver_id');
            }

            if (!Schema::hasColumn('buses', 'longitude_actuelle')) {
                $table->decimal('longitude_actuelle', 10, 7)->nullable()->after('latitude_actuelle');
            }
        });

        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips', 'type')) {
                $table->string('type')->default('pickup')->after('driver_id');
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'parent_id')) {
                $table->foreignId('parent_id')->nullable()->after('recipient_user_id')->constrained('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('notifications', 'date_envoi')) {
                $table->timestamp('date_envoi')->nullable()->after('message');
            }
        });

        DB::table('notifications')
            ->whereNull('date_envoi')
            ->update(['date_envoi' => DB::raw('created_at')]);

        Schema::create('presences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->string('status');
            $table->timestamp('recorded_at');
            $table->unique(['student_id', 'trip_id']);
        });

        Schema::table('buses', function (Blueprint $table) {
            $table->unique('driver_id');
        });
    }

    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->dropUnique(['driver_id']);
        });

        Schema::dropIfExists('presences');

        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasColumn('notifications', 'parent_id')) {
                $table->dropConstrainedForeignId('parent_id');
            }

            if (Schema::hasColumn('notifications', 'date_envoi')) {
                $table->dropColumn('date_envoi');
            }
        });

        Schema::table('trips', function (Blueprint $table) {
            if (Schema::hasColumn('trips', 'type')) {
                $table->dropColumn('type');
            }
        });

        Schema::table('buses', function (Blueprint $table) {
            foreach (['longitude_actuelle', 'latitude_actuelle'] as $column) {
                if (Schema::hasColumn('buses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('students', function (Blueprint $table) {
            foreach (['location_conformee', 'longitude', 'latitude'] as $column) {
                if (Schema::hasColumn('students', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
