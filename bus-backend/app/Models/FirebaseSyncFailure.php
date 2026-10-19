<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FirebaseSyncFailure extends Model
{
    protected $fillable = [
        'operation',
        'context',
        'user_id',
        'school_id',
        'desired_active',
        'desired_role',
        'desired_state',
        'attempts',
        'status',
        'last_attempt_at',
        'last_successful_sync_at',
        'next_retry_at',
        'membership_key',
        'last_error',
        'completed_at',
        'superseded_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'desired_active' => 'boolean',
            'desired_state' => 'array',
            'last_attempt_at' => 'datetime',
            'last_successful_sync_at' => 'datetime',
            'next_retry_at' => 'datetime',
            'completed_at' => 'datetime',
            'superseded_at' => 'datetime',
        ];
    }
}
