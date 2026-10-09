<?php

namespace App\Models;

use App\Traits\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use BelongsToSchool, SoftDeletes;

    protected $fillable = [
        'school_id',
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
            'home_lat' => 'float',
            'home_lng' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
            'location_conformee' => 'bool',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function parentUser(): BelongsTo
    {
        return $this->parent();
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
