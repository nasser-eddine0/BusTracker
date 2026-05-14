<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ensure the address and grade columns are truly nullable in the database,
     * and clean up any legacy "Unknown" placeholder values.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->text('address')->nullable()->change();
            $table->string('grade')->nullable()->change();
        });

        // Clean up legacy "Unknown" address values
        DB::table('students')
            ->whereRaw("LOWER(address) = 'unknown'")
            ->update(['address' => null]);
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->text('address')->nullable(false)->change();
            $table->string('grade')->nullable(false)->change();
        });
    }
};
