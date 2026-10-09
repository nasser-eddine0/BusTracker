<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class School extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'subdomain',
        'logo_path',
        'primary_color',
        'max_buses',
        'is_active',
        'subscription_status',
        'stripe_customer_id',
        'stripe_subscription_id',
        'stripe_price_id',
        'trial_ends_at',
        'subscription_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'max_buses' => 'integer',
            'is_active' => 'boolean',
            'trial_ends_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
        ];
    }

    public function isSubscribed(): bool
    {
        return in_array($this->subscription_status, ['active', 'trialing'], true)
            && !$this->hasExpired();
    }

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at !== null && $this->trial_ends_at->isFuture();
    }

    public function isOnGracePeriod(): bool
    {
        return $this->subscription_ends_at !== null && $this->subscription_ends_at->isFuture();
    }

    public function hasExpired(): bool
    {
        return !$this->isOnTrial()
            && !$this->isOnGracePeriod()
            && in_array($this->subscription_status, ['canceled', 'incomplete_expired', 'unpaid', 'past_due'], true);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
