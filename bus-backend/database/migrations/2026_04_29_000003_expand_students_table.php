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
            if (!Schema::hasColumn('students', 'home_lat')) {
                $table->decimal('home_lat', 10, 7)->nullable()->after('bus_id');
            }

            if (!Schema::hasColumn('students', 'home_lng')) {
                $table->decimal('home_lng', 10, 7)->nullable()->after('home_lat');
            }

            if (!Schema::hasColumn('students', 'status')) {
                $table->string('status')->default('waiting')->after('home_lng');
            }
        });

        DB::statement('ALTER TABLE students MODIFY bus_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            foreach (['status', 'home_lng', 'home_lat'] as $column) {
                if (Schema::hasColumn('students', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
