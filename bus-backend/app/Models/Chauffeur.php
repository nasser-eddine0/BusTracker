<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Chauffeur extends Utilisateur
{
    protected static function booted(): void
    {
        static::addGlobalScope('driver_role', fn (Builder $query) => $query->where('role', 'driver'));

        static::creating(function (self $driver): void {
            $driver->role = 'driver';
        });
    }

    public function bus(): HasOne
    {
        return $this->drivenBus();
    }

    public function voireListDesEleves()
    {
        return $this->drivenBus?->students()->orderBy('full_name')->get() ?? collect();
    }

    public function envoyerNotification(array $attributes): Notification
    {
        return Notification::create($attributes);
    }

    public function startTrip(Bus $bus, string $type = 'pickup'): Trip
    {
        return Trip::create([
            'bus_id' => $bus->id,
            'driver_id' => $this->id,
            'type' => $type,
            'trip_date' => now()->toDateString(),
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }
}
