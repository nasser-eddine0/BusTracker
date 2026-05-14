<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'recipient_user_id',
        'parent_id',
        'student_id',
        'bus_id',
        'trip_id',
        'created_by_user_id',
        'type',
        'title',
        'message',
        'date_envoi',
        'payload',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'date_envoi' => 'datetime',
            'payload' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ParentAccount::class, 'parent_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
