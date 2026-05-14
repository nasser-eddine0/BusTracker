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
        $table->integer('capacity')->default(20);
        
        // ربط الشيفور (ممكن يكون فارغ في الأول)
        $table->foreignId('driver_id')
              ->nullable()
              ->constrained('users')
              ->onDelete('set null'); 
              
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
