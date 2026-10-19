<?php

namespace Database\Seeders;

use App\Models\Bus;
use App\Models\Notification;
use App\Models\Presence;
use App\Models\Student;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;

class BackfillLegacyDataSeeder extends Seeder
{
    public function run(): void
    {
        $schoolId = 1;

        Bus::whereNull('school_id')->update(['school_id' => $schoolId]);
        Student::whereNull('school_id')->update(['school_id' => $schoolId]);
        Trip::whereNull('school_id')->update(['school_id' => $schoolId]);
        Notification::whereNull('school_id')->update(['school_id' => $schoolId]);
        Presence::whereNull('school_id')->update(['school_id' => $schoolId]);
        User::whereNull('school_id')
            ->where('role', '!=', 'super_admin')
            ->update(['school_id' => $schoolId]);
    }
}
