<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParentAccount extends Utilisateur
{
    protected static function booted(): void
    {
        static::addGlobalScope('parent_role', fn (Builder $query) => $query->where('role', 'parent'));

        static::creating(function (self $parent): void {
            $parent->role = 'parent';
        });
    }

    public function eleves(): HasMany
    {
        return $this->hasMany(Eleve::class, 'parent_id');
    }

    public function viewChildStatus(): array
    {
        return $this->children()->pluck('status', 'id')->all();
    }

    public function viewBusLocation(): array
    {
        return $this->children()
            ->with('bus')
            ->get()
            ->mapWithKeys(fn (Eleve $eleve) => [
                (string) $eleve->id => [
                    'lat' => $eleve->bus?->latitude_actuelle,
                    'lng' => $eleve->bus?->longitude_actuelle,
                ],
            ])
            ->all();
    }

    public function confirmPickupLocation(Eleve $eleve, bool $isConforme = true): bool
    {
        return $eleve->update(['location_conformee' => $isConforme]);
    }

    public function notifyChildAbsent(Eleve $eleve, ?Trajet $trajet = null): Notification
    {
        return Notification::create([
            'recipient_user_id' => $eleve->bus?->driver_id,
            'parent_id' => $this->id,
            'student_id' => $eleve->id,
            'trip_id' => $trajet?->id,
            'type' => 'absence_declared',
            'message' => "{$eleve->full_name} has been marked absent by the parent.",
            'date_envoi' => now(),
        ]);
    }

    public function receiveNotification()
    {
        return $this->notifications()->latest()->get();
    }
}
