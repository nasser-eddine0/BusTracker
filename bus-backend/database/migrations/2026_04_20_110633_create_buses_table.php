<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('buses', function (Blueprint $table) {
        $table->id();
        $table->string('bus_name'); // مثلاً: Bus 01
        $table->string('plate_number')->unique(); // Matricule
        $table->string('route_name')->nullable();
        $table->string('school_name')->nullable();
        $table->integer('capacity')->default(20);
        
        // ربط الشيفور (ممكن يكون فارغ في الأول)
        $table->foreignId('driver_id')
              ->unique()
              ->nullable()
              ->constrained('users')
              ->onDelete('set null'); 
              
        $table->decimal('latitude_actuelle', 10, 7)->nullable();
        $table->decimal('longitude_actuelle', 10, 7)->nullable();
        $table->string('trip_status')->default('idle');
        $table->timestamp('trip_started_at')->nullable();
        $table->timestamp('trip_completed_at')->nullable(); 
              
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('buses');
    }
};
