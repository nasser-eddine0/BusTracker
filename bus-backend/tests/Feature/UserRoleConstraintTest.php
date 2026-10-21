<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Group;
use RuntimeException;
use Tests\TestCase;

/**
 * Regression tests for the users.role constraint after the PostgreSQL
 * CHECK constraint fix migration (2026_10_21_000001).
 *
 * Supported roles tests run across all drivers (including SQLite).
 * PostgreSQL-specific constraint enforcement, normalization via migration,
 * constraint preservation, down() lifecycle, unexpected expression rejection,
 * and multi-column name safety are gated behind pgsql driver checks.
 *
 * PostgreSQL-specific runtime assertions are NOT VERIFIED unless
 * executed against a real PostgreSQL database.
 */
class UserRoleConstraintTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------
    // Supported roles accepted (Runs on SQLite, MySQL, PostgreSQL)
    // -------------------------------------------------------------------

    #[DataProvider('supportedRolesProvider')]
    public function test_supported_role_is_accepted(string $role): void
    {
        $school = School::create([
            'name' => 'Test School',
            'subdomain' => 'test-school',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $attrs = [
            'name' => "User {$role}",
            'email' => "{$role}@example.com",
            'password' => 'password123',
            'role' => $role,
            'status' => 'active',
        ];

        // super_admin has no school_id; others belong to a school.
        if ($role !== 'super_admin') {
            $attrs['school_id'] = $school->id;
        }

        $user = User::create($attrs);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => $role,
        ]);
    }

    public static function supportedRolesProvider(): array
    {
        return [
            'super_admin' => ['super_admin'],
            'admin' => ['admin'],
            'driver' => ['driver'],
            'parent' => ['parent'],
        ];
    }

    // -------------------------------------------------------------------
    // Legacy school_admin normalization via migration (PostgreSQL only)
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_legacy_school_admin_rows_are_normalized_by_migration(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "PostgreSQL legacy row normalization requires pgsql driver (running: {$driver})."
            );
        }

        $migration = require database_path('migrations/2026_10_21_000001_enforce_role_check_on_postgres.php');

        // Roll back the fix migration to restore the preceding 5-value constraint,
        // allowing insertion of the legacy school_admin row.
        $migration->down();

        $school = School::create([
            'name' => 'Legacy School',
            'subdomain' => 'legacy-school',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        DB::table('users')->insert([
            'name' => 'Legacy Admin',
            'email' => 'legacy@example.com',
            'password' => bcrypt('password123'),
            'school_id' => $school->id,
            'role' => 'school_admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'legacy@example.com',
            'role' => 'school_admin',
        ]);

        // Invoke the actual migration up() method.
        $migration->up();

        $this->assertDatabaseMissing('users', [
            'email' => 'legacy@example.com',
            'role' => 'school_admin',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'legacy@example.com',
            'role' => 'admin',
        ]);
    }

    // -------------------------------------------------------------------
    // PostgreSQL CHECK constraint enforcement (driver-conditional)
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_school_admin_rejected_by_postgres_check_constraint(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "PostgreSQL CHECK constraint enforcement requires pgsql driver (running: {$driver})."
            );
        }

        $school = School::create([
            'name' => 'PG School',
            'subdomain' => 'pg-school',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $caughtException = null;

        DB::beginTransaction();

        try {
            DB::table('users')->insert([
                'name' => 'Should Fail',
                'email' => 'fail-school-admin@example.com',
                'password' => bcrypt('password123'),
                'school_id' => $school->id,
                'role' => 'school_admin',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            $caughtException = $e;
        } finally {
            DB::rollBack();
        }

        $this->assertNotNull(
            $caughtException,
            'Inserting role=school_admin should be rejected by the PostgreSQL CHECK constraint.'
        );

        $sqlState = $caughtException->getCode();
        if ($caughtException->getPrevious() instanceof PDOException) {
            $sqlState = $caughtException->getPrevious()->getCode();
        }

        $this->assertSame(
            '23514',
            (string) $sqlState,
            'Expected SQLSTATE 23514 (check_violation), got: ' . $sqlState
        );

        $this->assertStringContainsString(
            'users_role_check',
            $caughtException->getMessage(),
            'Expected error message to identify users_role_check constraint.'
        );
    }

    #[Group('pgsql')]
    public function test_arbitrary_invalid_role_rejected_by_postgres_check_constraint(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "PostgreSQL CHECK constraint enforcement requires pgsql driver (running: {$driver})."
            );
        }

        $school = School::create([
            'name' => 'PG School 2',
            'subdomain' => 'pg-school-2',
            'max_buses' => 10,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        $caughtException = null;

        DB::beginTransaction();

        try {
            DB::table('users')->insert([
                'name' => 'Should Fail',
                'email' => 'fail-invalid@example.com',
                'password' => bcrypt('password123'),
                'school_id' => $school->id,
                'role' => 'hacker',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            $caughtException = $e;
        } finally {
            DB::rollBack();
        }

        $this->assertNotNull(
            $caughtException,
            'Inserting an arbitrary invalid role should be rejected by the PostgreSQL CHECK constraint.'
        );

        $sqlState = $caughtException->getCode();
        if ($caughtException->getPrevious() instanceof PDOException) {
            $sqlState = $caughtException->getPrevious()->getCode();
        }

        $this->assertSame(
            '23514',
            (string) $sqlState,
            'Expected SQLSTATE 23514 (check_violation), got: ' . $sqlState
        );

        $this->assertStringContainsString(
            'users_role_check',
            $caughtException->getMessage(),
            'Expected error message to identify users_role_check constraint.'
        );
    }

    // -------------------------------------------------------------------
    // Constraint introspection (PostgreSQL only)
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_postgres_constraint_permits_exactly_four_roles(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "Constraint introspection requires pgsql driver (running: {$driver})."
            );
        }

        $rows = DB::select("
            SELECT con.conname, pg_get_constraintdef(con.oid) AS def
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
            WHERE rel.relname = 'users'
              AND nsp.nspname = current_schema()
              AND con.contype = 'c'
              AND att.attname = 'role'
              AND cardinality(con.conkey) = 1
        ");

        $this->assertCount(1, $rows, 'Expected exactly one single-column CHECK constraint on users.role.');

        $def = $rows[0]->def;

        foreach (['super_admin', 'admin', 'driver', 'parent'] as $role) {
            $this->assertStringContainsString(
                "'{$role}'",
                $def,
                "CHECK constraint should accept '{$role}'."
            );
        }

        $this->assertStringNotContainsString(
            "'school_admin'",
            $def,
            'CHECK constraint must NOT accept school_admin.'
        );
    }

    // -------------------------------------------------------------------
    // Unrelated constraints survive up() and down() (PostgreSQL only)
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_unrelated_single_and_multi_column_constraints_survive_migration(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "Constraint survival tests require pgsql driver (running: {$driver})."
            );
        }

        $migration = require database_path('migrations/2026_10_21_000001_enforce_role_check_on_postgres.php');

        // Add unrelated single-column constraint on users.role (length check).
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_length_check CHECK (length("role"::text) > 2)');

        // Add unrelated multi-column constraint on users (role + school_id check).
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_school_check CHECK ("role"::text != \'super_admin\' OR "school_id" IS NULL)');

        try {
            // Exercise up()
            $migration->up();

            $this->assertTrue(
                $this->postgresConstraintExists('users_role_length_check'),
                'Unrelated single-column constraint must survive up().'
            );
            $this->assertTrue(
                $this->postgresConstraintExists('users_role_school_check'),
                'Unrelated multi-column constraint must survive up().'
            );
            $this->assertTrue(
                $this->postgresConstraintExists('users_role_check'),
                'Tightened role constraint must exist after up().'
            );

            // Exercise down()
            $migration->down();

            $this->assertTrue(
                $this->postgresConstraintExists('users_role_length_check'),
                'Unrelated single-column constraint must survive down().'
            );
            $this->assertTrue(
                $this->postgresConstraintExists('users_role_school_check'),
                'Unrelated multi-column constraint must survive down().'
            );
            $this->assertTrue(
                $this->postgresConstraintExists('users_role_check'),
                'Restored 5-value role constraint must exist after down().'
            );

            // Re-apply up() to restore state
            $migration->up();
        } finally {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_length_check');
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_school_check');
        }
    }

    // -------------------------------------------------------------------
    // down() lifecycle: school_admin permitted, normalized rows preserved
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_down_permits_school_admin_and_preserves_normalized_admin_rows(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "down() lifecycle tests require pgsql driver (running: {$driver})."
            );
        }

        $migration = require database_path('migrations/2026_10_21_000001_enforce_role_check_on_postgres.php');

        $school = School::create([
            'name' => 'Down Test School',
            'subdomain' => 'down-test-school',
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        // A user previously normalized to 'admin'
        $adminUser = User::create([
            'name' => 'Previously Normalized',
            'email' => 'prev-normalized@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'school_id' => $school->id,
            'status' => 'active',
        ]);

        try {
            // Exercise actual migration down()
            $migration->down();

            // 1. Previously normalized admin user remains 'admin' (down() must not revert data)
            $this->assertDatabaseHas('users', [
                'id' => $adminUser->id,
                'email' => 'prev-normalized@example.com',
                'role' => 'admin',
            ]);

            // 2. school_admin is now permitted again by the restored 5-value constraint
            DB::table('users')->insert([
                'name' => 'Permitted School Admin',
                'email' => 'permitted-school-admin@example.com',
                'password' => bcrypt('password123'),
                'school_id' => $school->id,
                'role' => 'school_admin',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->assertDatabaseHas('users', [
                'email' => 'permitted-school-admin@example.com',
                'role' => 'school_admin',
            ]);

            // 3. Arbitrary invalid roles are STILL rejected by the restored constraint
            $caughtException = null;
            DB::beginTransaction();
            try {
                DB::table('users')->insert([
                    'name' => 'Should Fail Under Down',
                    'email' => 'fail-down@example.com',
                    'password' => bcrypt('password123'),
                    'school_id' => $school->id,
                    'role' => 'bogus_role',
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                $caughtException = $e;
            } finally {
                DB::rollBack();
            }

            $this->assertNotNull(
                $caughtException,
                'Arbitrary roles must still be rejected under down() constraint.'
            );
            $sqlState = $caughtException->getCode();
            if ($caughtException->getPrevious() instanceof PDOException) {
                $sqlState = $caughtException->getPrevious()->getCode();
            }
            $this->assertSame('23514', (string) $sqlState);
        } finally {
            // Re-apply up() to restore database state for any subsequent tests
            $migration->up();
        }
    }

    // -------------------------------------------------------------------
    // Ambiguity handling: fail clearly without modifying data or schema
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_ambiguous_role_constraints_fail_before_modifying_data_or_schema(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "Ambiguity handling tests require pgsql driver (running: {$driver})."
            );
        }

        $migration = require database_path('migrations/2026_10_21_000001_enforce_role_check_on_postgres.php');

        // Create a second constraint that also matches a valid role allowlist
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_duplicate_check CHECK ("role"::text IN (\'super_admin\', \'admin\', \'driver\', \'parent\'))');

        $exceptionCaught = false;

        try {
            $migration->up();
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
            $this->assertStringContainsString('Ambiguous role check constraints found', $e->getMessage());
        } finally {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_duplicate_check');
        }

        $this->assertTrue(
            $exceptionCaught,
            'Migration up() must throw RuntimeException when multiple candidate allowlists are found.'
        );
    }

    // -------------------------------------------------------------------
    // Unexpected expression: not dropped, fails before mutation
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_unexpected_role_expression_is_not_dropped_and_fails_before_mutation(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "Unexpected expression tests require pgsql driver (running: {$driver})."
            );
        }

        $migration = require database_path('migrations/2026_10_21_000001_enforce_role_check_on_postgres.php');

        $school = School::create([
            'name' => 'Unexpected Expr School',
            'subdomain' => 'unexp-expr-school',
            'max_buses' => 5,
            'is_active' => true,
            'subscription_status' => 'active',
        ]);

        // Temporarily replace standard allowlist with an unexpected single-column expression on role
        DB::statement('ALTER TABLE users DROP CONSTRAINT users_role_check');
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_unexpected CHECK ("role"::text NOT IN (\'banned\', \'blocked\'))');

        // Seed a legacy school_admin row to prove mutation does NOT run if constraint resolution fails
        DB::table('users')->insert([
            'name' => 'Unchanged Legacy',
            'email' => 'unchanged-legacy@example.com',
            'password' => bcrypt('password123'),
            'school_id' => $school->id,
            'role' => 'school_admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $exceptionCaught = false;

        try {
            $migration->up();
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
            $this->assertStringContainsString('Expected role allowlist CHECK constraint on users.role was not found', $e->getMessage());
        } finally {
            try {
                // Assert unexpected constraint was NOT dropped
                $this->assertTrue(
                    $this->postgresConstraintExists('users_role_unexpected'),
                    'Unexpected role constraint must survive untouched when allowlist matcher rejects it.'
                );

                // Assert data mutation was NOT executed
                $this->assertDatabaseHas('users', [
                    'email' => 'unchanged-legacy@example.com',
                    'role' => 'school_admin',
                ]);
            } finally {
                // Remove only the exact synthetic fixture before restoring the constraint
                DB::table('users')->where('email', 'unchanged-legacy@example.com')->delete();

                // Restore standard state
                DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_unexpected');
                DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (\"role\"::text IN ('super_admin', 'admin', 'driver', 'parent'))");
            }
        }

        $this->assertTrue(
            $exceptionCaught,
            'Migration must throw RuntimeException when constraint expression is unexpected.'
        );
    }

    // -------------------------------------------------------------------
    // Misleading users_role_check name on multi-column constraint
    // -------------------------------------------------------------------

    #[Group('pgsql')]
    public function test_misleading_users_role_check_name_on_multi_column_constraint_is_not_dropped(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver !== 'pgsql') {
            $this->markTestSkipped(
                "Misleading name tests require pgsql driver (running: {$driver})."
            );
        }

        $migration = require database_path('migrations/2026_10_21_000001_enforce_role_check_on_postgres.php');

        // Drop single-column users_role_check and add a multi-column constraint with that exact name
        DB::statement('ALTER TABLE users DROP CONSTRAINT users_role_check');
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK ("role"::text != \'super_admin\' OR "school_id" IS NULL)');

        $exceptionCaught = false;

        try {
            $migration->up();
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
            $this->assertStringContainsString('Expected role allowlist CHECK constraint on users.role was not found', $e->getMessage());
        } finally {
            // Assert multi-column constraint with misleading name was NOT dropped by name lookup
            $this->assertTrue(
                $this->postgresConstraintExists('users_role_check'),
                'Multi-column constraint named users_role_check must NOT be dropped by migration.'
            );

            // Restore clean state
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (\"role\"::text IN ('super_admin', 'admin', 'driver', 'parent'))");
        }

        $this->assertTrue(
            $exceptionCaught,
            'Migration must reject multi-column constraint even if named users_role_check.'
        );
    }

    /**
     * Helper to verify if a constraint exists in pg_constraint.
     */
    private function postgresConstraintExists(string $constraintName): bool
    {
        $rows = DB::select('
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = \'users\'
              AND nsp.nspname = current_schema()
              AND con.conname = ?
        ', [$constraintName]);

        return count($rows) > 0;
    }
}
