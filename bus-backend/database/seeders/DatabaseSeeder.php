<?php

namespace Database\Seeders;

use App\Models\Bus;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@test.com'],
            [
                'name' => 'Admin Nasser',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $driver = User::updateOrCreate(
            ['email' => 'driver@test.com'],
            [
                'name' => 'Chauffeur Ahmed',
                'password' => Hash::make('password123'),
                'role' => 'driver',
                'status' => 'active',
            ]
        );

        $bus = Bus::updateOrCreate(
            ['plate_number' => '12345-A-40'],
            [
                'bus_name' => 'School Bus North',
                'route_name' => 'North Route',
                'capacity' => 24,
                'driver_id' => $driver->id,
                'school_name' => 'BusTracker',
                'latitude_actuelle' => 27.1536111,
                'longitude_actuelle' => -13.2033333,
                'trip_status' => 'idle',
            ]
        );

        $parent = User::updateOrCreate(
            ['email' => 'parent@test.com'],
            [
                'name' => 'Parent Khalid',
                'password' => Hash::make('password123'),
                'role' => 'parent',
                'status' => 'active',
            ]
        );

        Student::updateOrCreate(
            ['reg_code' => 'BSTU001'],
            [
                'full_name' => 'Amine Khalid',
                'grade' => 'CM2',
                'address' => 'Hay El Hassani, No 12, Laayoune',
                'parent_id' => $parent->id,
                'bus_id' => $bus->id,
                'latitude' => 27.1500000,
                'longitude' => -13.1990000,
                'location_conformee' => true,
                'status' => 'waiting',
            ]
        );

        $admin->refresh();
        $driver->refresh();
        $parent->refresh();

        $this->command?->info('Demo accounts seeded successfully.');
    }
}
