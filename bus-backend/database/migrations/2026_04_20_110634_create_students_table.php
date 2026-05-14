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
    Schema::create('students', function (Blueprint $table) {
        $table->id();
        $table->string('full_name');
        $table->string('grade')->nullable();
        $table->text('address')->nullable();
        
        // كود فريد كيعطيه الأدمين للأب (مثلاً: B102)
        $table->string('reg_code')->unique(); 
        
        // الأب (nullable حيت كنزيدو التلميذ قبل ما يتسجل الأب)
        $table->foreignId('parent_id')
              ->nullable()
              ->constrained('users')
              ->onDelete('set null');
              
        // الطوبيس (nullable حيت التلميذ يقدر يكون باقي ماتعطاهش طوبيس فاش كيتسجل من الإكسيل)
        $table->foreignId('bus_id')
              ->nullable()
              ->constrained('buses')
              ->onDelete('cascade');
              
        $table->decimal('home_lat', 10, 7)->nullable();
        $table->decimal('home_lng', 10, 7)->nullable();
        $table->decimal('latitude', 10, 7)->nullable();
        $table->decimal('longitude', 10, 7)->nullable();
        $table->boolean('location_conformee')->default(false);
        $table->string('status')->default('waiting');
              
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
