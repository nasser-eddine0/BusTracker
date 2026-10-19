<?php

namespace App\Services;

use App\Contracts\MembershipProjectionWriter;
use Kreait\Firebase\Contract\Database;

final class KreaitMembershipProjectionWriter implements MembershipProjectionWriter
{
    public function __construct(private Database $database) {}

    public function set(int $schoolId, int $userId, array $payload): void
    {
        $this->database->getReference("school_users/{$schoolId}/{$userId}")->set($payload);
    }

    public function deactivate(int $schoolId, int $userId, array $payload): void
    {
        $this->set($schoolId, $userId, $payload);
    }

    public function removeSchool(int $schoolId): void
    {
        $this->database->getReference("school_users/{$schoolId}")->remove();
    }
}
