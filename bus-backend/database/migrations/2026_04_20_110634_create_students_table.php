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
        $table->text('address');
        
        // كود فريد كيعطيه الأدمين للأب (مثلاً: B102)
        $table->string('reg_code')->unique(); 
        
        // الأب (nullable حيت كنزيدو التلميذ قبل ما يتسجل الأب)
        $table->foreignId('parent_id')
              ->nullable()
              ->constrained('users')
              ->onDelete('set null');
              
        // الطوبيس (ضروري التلميذ يكون عندو طوبيس من النهار الأول)
        $table->foreignId('bus_id')
              ->constrained('buses')
              ->onDelete('cascade');
              
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
