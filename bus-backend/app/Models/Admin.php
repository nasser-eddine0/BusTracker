<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

class Admin extends User
{
    protected $table = 'users';

    protected static function booted(): void
    {
        static::addGlobalScope('admin_role', fn (Builder $query) => $query->where('role', 'admin'));

        static::creating(function (self $admin): void {
            $admin->role = 'admin';
        });
    }
}
