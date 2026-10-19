<?php

namespace Database\Seeders;

use App\Models\Bus;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class Phase21ParentFixture extends Seeder
{
    public function run(): void
    {
        $database = (string) config('database.connections.sqlite.database');
        $temp = realpath(sys_get_temp_dir());
        $resolved = realpath($database) ?: $database;
        $tempPrefix = $temp ? rtrim(strtolower(str_replace('\\', '/', $temp)), '/').'/' : '';
        $databasePath = strtolower(str_replace('\\', '/', $resolved));
        if (config('database.default') !== 'sqlite' || $tempPrefix === '' || ! str_starts_with($databasePath, $tempPrefix)) {
            throw new \RuntimeException('Phase 21 fixture requires a temporary SQLite database.');
        }

        $email = env('BUS_TRACKER_TEST_EMAIL');
        $password = env('BUS_TRACKER_TEST_PASSWORD');
        if (! $email || ! $password) {
            throw new \RuntimeException('Phase 21 fixture requires BUS_TRACKER_TEST_EMAIL and BUS_TRACKER_TEST_PASSWORD.');
        }

        $school = School::firstOrCreate(['id' => 1], ['name' => 'Phase21 School A', 'subdomain' => 'phase21-a', 'is_active' => true]);
        School::firstOrCreate(['id' => 2], ['name' => 'Phase21 School B', 'subdomain' => 'phase21-b', 'is_active' => true]);
        $parent = User::updateOrCreate(['email' => $email], [
            'name' => 'Synthetic Parent', 'password' => Hash::make($password),
            'phone' => null, 'role' => 'parent', 'school_id' => $school->id, 'status' => 'active',
        ]);
        $authorizedBus = Bus::updateOrCreate(['plate_number' => 'PHASE21-AUTHORIZED'], ['school_id' => $school->id, 'bus_name' => 'Phase21 Authorized', 'capacity' => 20, 'driver_id' => null]);
        $unauthorizedBus = Bus::updateOrCreate(['plate_number' => 'PHASE21-UNAUTHORIZED'], ['school_id' => $school->id, 'bus_name' => 'Phase21 Unauthorized', 'capacity' => 20, 'driver_id' => null]);
        $otherBus = Bus::updateOrCreate(['plate_number' => 'PHASE21-OTHER'], ['school_id' => 2, 'bus_name' => 'Phase21 Other School', 'capacity' => 20, 'driver_id' => null]);
        $childA = Student::updateOrCreate(['reg_code' => 'PHASE21-CHILD-A'], [
            'school_id' => $school->id, 'full_name' => 'Synthetic Child A', 'parent_id' => $parent->id, 'bus_id' => $authorizedBus->id, 'status' => 'waiting',
        ]);
        $childB = Student::updateOrCreate(['reg_code' => 'PHASE21-CHILD-B'], [
            'school_id' => $school->id, 'full_name' => 'Synthetic Child B', 'parent_id' => null, 'bus_id' => $unauthorizedBus->id, 'status' => 'waiting',
        ]);
        fwrite(STDOUT, json_encode(['parent_id' => $parent->id, 'child_a_id' => $childA->id, 'child_b_id' => $childB->id, 'authorized_bus_id' => $authorizedBus->id, 'unauthorized_bus_id' => $unauthorizedBus->id, 'other_school_bus_id' => $otherBus->id], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
