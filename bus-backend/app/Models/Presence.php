<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presence extends Model
{
    protected $fillable = [
        'student_id',
        'trip_id',
        'status',
        'recorded_at',
    ];

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
        ];
    }

    public function eleve(): BelongsTo
    {
        return $this->belongsTo(Eleve::class, 'student_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function trajet(): BelongsTo
    {
        return $this->belongsTo(Trajet::class, 'trip_id');
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class, 'trip_id');
    }
}
