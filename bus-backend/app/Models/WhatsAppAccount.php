<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppAccount extends Model
{
    protected $table = 'whatsapp_accounts';

    protected $guarded = ['*'];

    protected $hidden = [
        'bsuid_encrypted',
        'bsuid_hash',
        'destination_e164_encrypted',
        'destination_e164_hash',
    ];

    protected function casts(): array
    {
        return [
            'bsuid_encrypted' => 'encrypted',
            'destination_e164_encrypted' => 'encrypted',
            'verified_at' => 'datetime',
            'reverify_at' => 'datetime',
            'revoked_at' => 'datetime',
            'consented_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function isUsable(): bool
    {
        return $this->status === 'linked'
            && $this->revoked_at === null
            && $this->verified_at !== null
            && $this->reverify_at?->isFuture() === true;
    }
}
