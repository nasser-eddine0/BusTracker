<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

class SuperAdminSchoolCreationTest extends TestCase
{
    use RefreshDatabase;

    private function createSuperAdmin(): User
    {
        return User::create([
            'name' => 'Super Admin',
            'email' => 'super.admin@example.com',
            'password' => 'secret123',
            'role' => 'super_admin',
            'status' => 'active',
            'school_id' => null,
            'email_verified_at' => now(),
        ]);
    }

    public function test_super_admin_can_create_school_with_standard_payload(): void
    {
        $superAdmin = $this->createSuperAdmin();

        $payload = [
            'name' => 'al qady',
            'subdomain' => 'al-qadi',
            'max_buses' => 10,
            'primary_color' => '#facc15',
        ];

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/super-admin/schools', $payload);

        $response->assertCreated();
        $response->assertJsonPath('message', 'School created successfully.');
        $response->assertJsonPath('school.name', 'al qady');
        $response->assertJsonPath('school.subdomain', 'al-qadi');
        $response->assertJsonPath('school.max_buses', 10);
        $response->assertJsonPath('school.primary_color', '#facc15');

        $this->assertDatabaseHas('schools', [
            'name' => 'al qady',
            'subdomain' => 'al-qadi',
            'max_buses' => 10,
            'primary_color' => '#facc15',
        ]);

        $school = School::where('subdomain', 'al-qadi')->firstOrFail();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $superAdmin->id,
            'school_id' => $school->id,
            'action' => 'school_created',
        ]);
    }

    public function test_duplicate_subdomain_is_rejected_before_db_insertion(): void
    {
        $superAdmin = $this->createSuperAdmin();

        School::create([
            'name' => 'Existing School',
            'subdomain' => 'al-qadi',
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/super-admin/schools', [
                'name' => 'Second School',
                'subdomain' => 'al-qadi',
                'max_buses' => 10,
            ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['subdomain']);
    }

    #[Group('pgsql')]
    public function test_postgres_school_creation_persists_defaults_and_sequence(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'pgsql') {
            $this->markTestSkipped("PostgreSQL school creation verification requires pgsql driver (running: {$driver}).");
        }

        $superAdmin = $this->createSuperAdmin();

        $payload = [
            'name' => 'al qady',
            'subdomain' => 'al-qadi-pg',
            'max_buses' => 10,
            'primary_color' => '#facc15',
        ];

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/super-admin/schools', $payload);

        $response->assertCreated();

        $school = School::where('subdomain', 'al-qadi-pg')->firstOrFail();
        $this->assertGreaterThan(0, $school->id);
        $this->assertTrue((bool) $school->is_active);
        $this->assertSame('active', $school->subscription_status);
    }
}
