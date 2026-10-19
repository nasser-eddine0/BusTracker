<?php

namespace Database\Seeders;

use App\Models\Bus;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class Phase20DriverFixture extends Seeder
{
    public function run(): void
    {
        $database = (string) config('database.connections.sqlite.database');
        $temp = realpath(sys_get_temp_dir());
        $resolved = realpath($database) ?: $database;
        $tempPrefix = $temp ? rtrim(strtolower(str_replace('\\', '/', $temp)), '/').'/' : '';
        $databasePath = strtolower(str_replace('\\', '/', $resolved));
        if (config('database.default') !== 'sqlite' || $tempPrefix === '' || ! str_starts_with($databasePath, $tempPrefix)) {
            throw new \RuntimeException('Phase 20 fixture requires a temporary SQLite database.');
        }

        $email = env('BUS_TRACKER_TEST_EMAIL');
        $password = env('BUS_TRACKER_TEST_PASSWORD');
        if (! $email || ! $password) {
            throw new \RuntimeException('Phase 20 fixture requires BUS_TRACKER_TEST_EMAIL and BUS_TRACKER_TEST_PASSWORD.');
        }

        $schoolA = School::firstOrCreate(['id' => 1], ['name' => 'Phase20 School A', 'subdomain' => 'phase20-a', 'is_active' => true]);
        School::firstOrCreate(['id' => 2], ['name' => 'Phase20 School B', 'subdomain' => 'phase20-b', 'is_active' => true]);
        $driver = User::updateOrCreate(['email' => $email], [
            'name' => 'Synthetic Driver', 'password' => Hash::make($password),
            'phone' => null, 'role' => 'driver', 'school_id' => $schoolA->id, 'status' => 'active',
        ]);
        $assigned = Bus::updateOrCreate(['plate_number' => 'PHASE20-ASSIGNED'], ['school_id' => $schoolA->id, 'bus_name' => 'Phase20 Assigned', 'capacity' => 20, 'driver_id' => $driver->id]);
        $unassigned = Bus::updateOrCreate(['plate_number' => 'PHASE20-UNASSIGNED'], ['school_id' => $schoolA->id, 'bus_name' => 'Phase20 Unassigned', 'capacity' => 20, 'driver_id' => null]);
        $other = Bus::updateOrCreate(['plate_number' => 'PHASE20-OTHER'], ['school_id' => 2, 'bus_name' => 'Phase20 Other School', 'capacity' => 20, 'driver_id' => null]);
        fwrite(STDOUT, json_encode(['driver_id' => $driver->id, 'assigned_bus_id' => $assigned->id, 'unassigned_bus_id' => $unassigned->id, 'other_school_bus_id' => $other->id], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
