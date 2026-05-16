<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Bus extends Model
{
    protected $fillable = [
        'bus_name',
        'plate_number',
        'capacity',
        'driver_id',
        'route_name',
        'school_name',
        'latitude_actuelle',
        'longitude_actuelle',
        'trip_status',
        'trip_started_at',
        'trip_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude_actuelle' => 'float',
            'longitude_actuelle' => 'float',
            'trip_started_at' => 'datetime',
            'trip_completed_at' => 'datetime',
        ];
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Chauffeur::class, 'driver_id');
    }

    public function driverUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }

    public function activeTrip(): HasOne
    {
        return $this->hasOne(Trip::class)
            ->where('trips.status', 'in_progress')
            ->whereDate('trips.trip_date', now()->toDateString())
            ->latestOfMany();
    }

    public function chauffeur(): HasOne
    {
        return $this->hasOne(Chauffeur::class, 'id', 'driver_id');
    }
}
