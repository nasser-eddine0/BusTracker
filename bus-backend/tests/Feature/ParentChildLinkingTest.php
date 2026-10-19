<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ParentChildLinkingTest extends TestCase
{
    use RefreshDatabase;

    public function test_unlinked_parent_with_null_school_id_successfully_links_child_and_adopts_school_id(): void
    {
        $school = School::create([
            'name' => 'School Alpha',
            'subdomain' => 'alpha',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $student = Student::create([
            'school_id' => $school->id,
            'full_name' => 'Alice Smith',
            'grade' => '5th',
            'reg_code' => 'REG-ALPHA-001',
            'status' => 'waiting',
        ]);

        $parent = User::create([
            'name' => 'John Smith',
            'email' => 'john.smith@example.com',
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
            'school_id' => null,
        ]);

        $response = $this->actingAs($parent, 'sanctum')
            ->postJson('/api/parent/link-child', [
                'reg_code' => 'REG-ALPHA-001',
            ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Child linked successfully.')
            ->assertJsonPath('student.name', 'Alice Smith');

        $this->assertDatabaseHas('users', [
            'id' => $parent->id,
            'school_id' => $school->id,
        ]);

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'parent_id' => $parent->id,
            'school_id' => $school->id,
        ]);
    }

    public function test_parent_belonging_to_school_a_cannot_link_child_from_school_b(): void
    {
        $schoolA = School::create([
            'name' => 'School Alpha',
            'subdomain' => 'alpha',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $schoolB = School::create([
            'name' => 'School Beta',
            'subdomain' => 'beta',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $studentB = Student::create([
            'school_id' => $schoolB->id,
            'full_name' => 'Bob Beta',
            'reg_code' => 'REG-BETA-999',
            'status' => 'waiting',
        ]);

        $parentA = User::create([
            'name' => 'Parent Alpha',
            'email' => 'alpha.parent@example.com',
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
            'school_id' => $schoolA->id,
        ]);

        $response = $this->actingAs($parentA, 'sanctum')
            ->postJson('/api/parent/link-child', [
                'reg_code' => 'REG-BETA-999',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['reg_code']);

        $this->assertDatabaseHas('users', [
            'id' => $parentA->id,
            'school_id' => $schoolA->id,
        ]);

        $this->assertDatabaseHas('students', [
            'id' => $studentB->id,
            'parent_id' => null,
        ]);
    }

    public function test_linking_fails_with_invalid_registration_code(): void
    {
        $parent = User::create([
            'name' => 'New Parent',
            'email' => 'new.parent@example.com',
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
            'school_id' => null,
        ]);

        $response = $this->actingAs($parent, 'sanctum')
            ->postJson('/api/parent/link-child', [
                'reg_code' => 'INVALID-CODE-XYZ',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['reg_code']);
    }

    public function test_child_already_linked_to_another_parent_cannot_be_relinked(): void
    {
        $school = School::create([
            'name' => 'School Alpha',
            'subdomain' => 'alpha',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $parentOriginal = User::create([
            'name' => 'Original Parent',
            'email' => 'original@example.com',
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
            'school_id' => $school->id,
        ]);

        $student = Student::create([
            'school_id' => $school->id,
            'parent_id' => $parentOriginal->id,
            'full_name' => 'Charlie Smith',
            'reg_code' => 'REG-CHARLIE',
            'status' => 'waiting',
        ]);

        $parentAttacker = User::create([
            'name' => 'Attacker Parent',
            'email' => 'attacker@example.com',
            'password' => Hash::make('password123'),
            'role' => 'parent',
            'status' => 'active',
            'school_id' => null,
        ]);

        $response = $this->actingAs($parentAttacker, 'sanctum')
            ->postJson('/api/parent/link-child', [
                'reg_code' => 'REG-CHARLIE',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['reg_code']);

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'parent_id' => $parentOriginal->id,
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $parentAttacker->id,
            'school_id' => null,
        ]);
    }

    public function test_unauthorized_non_parent_roles_cannot_access_link_child_endpoint(): void
    {
        $school = School::create([
            'name' => 'School Alpha',
            'subdomain' => 'alpha',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $driver = User::create([
            'name' => 'Driver Dave',
            'email' => 'dave@example.com',
            'password' => Hash::make('password123'),
            'role' => 'driver',
            'status' => 'active',
            'school_id' => $school->id,
        ]);

        $response = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/parent/link-child', [
                'reg_code' => 'SOME-CODE',
            ]);

        $response->assertForbidden();
    }

    public function test_unauthenticated_guest_cannot_access_link_child_endpoint(): void
    {
        $response = $this->postJson('/api/parent/link-child', [
            'reg_code' => 'SOME-CODE',
        ]);

        $response->assertUnauthorized();
    }
}
