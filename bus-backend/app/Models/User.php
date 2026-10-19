<?php

namespace App\Models;

use App\Traits\BelongsToSchool;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use BelongsToSchool, HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'school_id',
        'role',
        'phone',
        'status',
        'cin',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function drivenBus(): HasOne
    {
        return $this->hasOne(Bus::class, 'driver_id');
    }

    public function bus(): HasOne
    {
        return $this->drivenBus();
    }

    public function children(): HasMany
    {
        return $this->hasMany(Student::class, 'parent_id');
    }

    public function students(): HasMany
    {
        return $this->children();
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'recipient_user_id');
    }

    public function sentNotifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'created_by_user_id');
    }

    public function signIn(): bool
    {
        return $this->status === 'active';
    }

    public function signOut(): bool
    {
        return true;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isDriver(): bool
    {
        return $this->role === 'driver';
    }

    public function isParent(): bool
    {
        return $this->role === 'parent';
    }

    public function startTrip(Bus $bus, string $type = 'aller'): Trip
    {
        return Trip::create([
            'school_id' => $bus->school_id,
            'bus_id' => $bus->id,
            'driver_id' => $this->id,
            'type' => $type,
            'trip_date' => now()->toDateString(),
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }

    public function confirmPickupLocation(Student $student, bool $isConforme = true): bool
    {
        return $student->update(['location_conformee' => $isConforme]);
    }

    public function notifyChildAbsent(Student $student, ?Trip $trip = null): Notification
    {
        return Notification::create([
            'recipient_user_id' => $student->bus?->driver_id,
            'parent_id' => $this->id,
            'student_id' => $student->id,
            'trip_id' => $trip?->id,
            'type' => 'absence_declared',
            'title' => 'Parent absence update',
            'message' => "{$student->full_name} has been marked absent by the parent.",
            'date_envoi' => now(),
        ]);
    }
}
