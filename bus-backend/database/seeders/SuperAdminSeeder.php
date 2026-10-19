<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'super@test.com'],
            [
                'name' => 'Super Admin',
                'password' => 'password123',
                'role' => 'super_admin',
                'status' => 'active',
                'school_id' => null,
            ]
        );

        $this->command?->info('Super Admin account ready: super@test.com / password123');
    }
}
