<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class AdminNotificationRecipients
{
    /**
     * @return Collection<int, User>
     */
    public function activeForSchool(int $schoolId): Collection
    {
        return User::query()
            ->where('school_id', $schoolId)
            ->where('role', 'admin')
            ->where('status', 'active')
            ->get(['id']);
    }
}
