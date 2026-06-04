<?php

namespace Tests\Unit;

use App\Models\User;
use PHPUnit\Framework\TestCase;

class UserRoleTest extends TestCase
{
    public function test_user_role_helpers_match_current_role(): void
    {
        $admin = new User(['role' => 'admin', 'status' => 'active']);
        $driver = new User(['role' => 'driver', 'status' => 'active']);
        $parent = new User(['role' => 'parent', 'status' => 'disabled']);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($admin->isDriver());

        $this->assertTrue($driver->isDriver());
        $this->assertFalse($driver->isParent());

        $this->assertTrue($parent->isParent());
        $this->assertFalse($parent->signIn());
    }
}
