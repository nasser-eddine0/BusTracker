<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'school_admin')
            ->update(['role' => 'admin']);

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement(
            "ALTER TABLE users MODIFY role ENUM('super_admin', 'admin', 'driver', 'parent') NOT NULL DEFAULT 'parent'"
        );
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement(
            "ALTER TABLE users MODIFY role ENUM('super_admin', 'admin', 'school_admin', 'driver', 'parent') NOT NULL DEFAULT 'parent'"
        );
    }
};
