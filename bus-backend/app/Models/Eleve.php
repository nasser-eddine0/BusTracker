<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Eleve extends Model
{
    protected $table = 'students';

    protected $fillable = [
        'full_name',
        'grade',
        'address',
        'reg_code',
        'parent_id',
        'bus_id',
        'home_lat',
        'home_lng',
        'latitude',
        'longitude',
        'location_conformee',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'location_conformee' => 'bool',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ParentAccount::class, 'parent_id');
    }

    public function parentUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function presences(): HasMany
    {
        return $this->hasMany(Presence::class, 'student_id');
    }
}
