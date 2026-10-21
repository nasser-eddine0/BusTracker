<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fix the PostgreSQL CHECK constraint for users.role.
 *
 * The initial migration (0001_01_01_000000) created the role column as:
 *   enum('role', ['super_admin','admin','school_admin','driver','parent'])
 *
 * On PostgreSQL, Laravel translates this to:
 *   varchar(255) check ("role" in ('super_admin','admin','school_admin','driver','parent'))
 *
 * Migration 2026_06_09_000008 removed 'school_admin' from the MySQL ENUM
 * and migrated existing rows, but skipped the ALTER on non-MySQL drivers.
 * This leaves the PostgreSQL CHECK constraint still accepting 'school_admin'.
 *
 * This additive migration:
 * 1. Guards immediately behind pgsql check (leaving MySQL and SQLite unchanged).
 * 2. Resolves the existing role allowlist constraint before touching data or schema.
 * 3. Fails loudly if constraint is missing, unrecognized, or ambiguous.
 * 4. Normalizes legacy school_admin rows to admin on PostgreSQL.
 * 5. Drops only the identified single-column role allowlist constraint.
 * 6. Adds the tightened constraint (super_admin, admin, driver, parent).
 */
return new class extends Migration
{
    private const ALLOWED_ROLES = ['super_admin', 'admin', 'driver', 'parent'];

    private const ALLOWED_ROLES_WITH_LEGACY = ['super_admin', 'admin', 'school_admin', 'driver', 'parent'];

    public function up(): void
    {
        // Guard immediately: MySQL and SQLite behavior must remain unchanged.
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Step 1: Discover target constraint BEFORE changing any data or schema.
        // Fails with RuntimeException if missing, unrecognized, or ambiguous.
        $targetConstraint = $this->findRoleAllowlistConstraint();

        // Step 2: Normalize legacy rows on PostgreSQL now that target constraint is verified.
        DB::table('users')
            ->where('role', 'school_admin')
            ->update(['role' => 'admin']);

        // Step 3: Drop the discovered role constraint.
        DB::statement(sprintf(
            'ALTER TABLE users DROP CONSTRAINT %s',
            $this->quoteIdentifier($targetConstraint)
        ));

        // Step 4: Add the tightened constraint.
        $this->addTightenedConstraint();
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Step 1: Discover target constraint BEFORE changing schema.
        // Fails with RuntimeException if missing, unrecognized, or ambiguous.
        $targetConstraint = $this->findRoleAllowlistConstraint();

        // Step 2: Drop the discovered role constraint.
        DB::statement(sprintf(
            'ALTER TABLE users DROP CONSTRAINT %s',
            $this->quoteIdentifier($targetConstraint)
        ));

        // Step 3: Restore the preceding 5-value constraint. We do NOT pretend to
        // restore historical school_admin row values — only the schema.
        $inList = $this->buildInList(self::ALLOWED_ROLES_WITH_LEGACY);

        DB::statement(
            "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (\"role\"::text IN ({$inList}))"
        );
    }

    /**
     * Find the single-column CHECK constraint on users.role that implements the role allowlist.
     *
     * To ensure unrelated constraints (e.g. length checks, custom validators, multi-column rules)
     * are never dropped or modified:
     * 1. Inspects pg_constraint joined with pg_attribute where cardinality(conkey) = 1 and attname = 'role'.
     * 2. Rejects any name-based fallback to guarantee multi-column or misnamed constraints are never selected.
     * 3. Validates that the constraint expression strictly matches the exact 4-role or 5-role allowlist form.
     * 4. Throws RuntimeException BEFORE mutating any data or schema if the constraint is missing,
     *    unrecognized, or ambiguous.
     *
     * @return string The exact constraint name to replace.
     * @throws \RuntimeException If missing, unrecognized, or ambiguous.
     */
    private function findRoleAllowlistConstraint(): string
    {
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

        $candidates = [];
        foreach ($rows as $row) {
            if ($this->isRoleAllowlistDefinition((string) $row->def)) {
                $candidates[] = (string) $row->conname;
            }
        }

        $uniqueCandidates = array_values(array_unique($candidates));

        if (count($uniqueCandidates) === 0) {
            throw new \RuntimeException(
                'Expected role allowlist CHECK constraint on users.role was not found or has an unrecognized expression. Aborting to avoid unsafe schema or data mutation.'
            );
        }

        if (count($uniqueCandidates) > 1) {
            throw new \RuntimeException(sprintf(
                'Ambiguous role check constraints found on users table: [%s]. Cannot determine which constraint to replace safely. Aborting.',
                implode(', ', $uniqueCandidates)
            ));
        }

        return $uniqueCandidates[0];
    }

    /**
     * Check if a constraint definition matches the exact PostgreSQL role allowlist
     * generated by Laravel for either the 4-role or 5-role set.
     *
     * Rejects negative operators (NOT IN, !=, <>), conjunctions/disjunctions (AND, OR),
     * and any set of values that does not exactly match the allowed roles.
     */
    private function isRoleAllowlistDefinition(string $def): bool
    {
        // Must start with CHECK ( and end with )
        if (!preg_match('/^CHECK\s*\((.+)\)$/si', trim($def), $mCheck)) {
            return false;
        }

        $inner = trim($mCheck[1]);

        // Reject any negation, conjunction, disjunction, or additional operator
        if (preg_match('/\b(NOT|OR|AND|LIKE|ILIKE|BETWEEN)\b|[!<>]=?/i', $inner)) {
            return false;
        }

        // Must match either:
        // 1. PostgreSQL deparsed: ((role)::text = ANY (ARRAY[...]))
        // 2. Direct IN syntax: ("role"::text IN (...))
        if (!preg_match('/^\(+\s*"?role"?\s*\)?(?:::text)?\s*(= ANY|\bIN\b)\s*(.+)$/si', $inner, $mOp)) {
            return false;
        }

        $rhs = trim($mOp[2]);

        // Extract single-quoted string literals from RHS
        if (!preg_match_all("/'([^']+)'/", $rhs, $matches)) {
            return false;
        }

        $literals = $matches[1];
        sort($literals);

        $fourRoles = ['admin', 'driver', 'parent', 'super_admin'];
        $fiveRoles = ['admin', 'driver', 'parent', 'school_admin', 'super_admin'];

        if ($literals !== $fourRoles && $literals !== $fiveRoles) {
            return false;
        }

        // Verify no stray tokens or unexpected expressions remain in the RHS
        $clean = preg_replace("/'[^']*'/", '', $rhs);
        $clean = preg_replace('/\b(ARRAY|character|varying|varchar|text)\b/i', '', $clean);
        $clean = preg_replace('/[,\s\[\]\(\):]/', '', $clean);

        return $clean === '';
    }

    private function addTightenedConstraint(): void
    {
        $inList = $this->buildInList(self::ALLOWED_ROLES);

        DB::statement(
            "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (\"role\"::text IN ({$inList}))"
        );
    }

    private function buildInList(array $values): string
    {
        return implode(', ', array_map(
            fn (string $v) => "'" . str_replace("'", "''", $v) . "'",
            $values
        ));
    }

    private function quoteIdentifier(string $name): string
    {
        return '"' . str_replace('"', '""', $name) . '"';
    }
};
