<?php

namespace App\Contracts;

interface MembershipProjectionWriter
{
    public function set(int $schoolId, int $userId, array $payload): void;

    public function deactivate(int $schoolId, int $userId, array $payload): void;

    public function removeSchool(int $schoolId): void;
}
