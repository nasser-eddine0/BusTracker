<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

class Admin extends Utilisateur
{
    protected static function booted(): void
    {
        static::addGlobalScope('admin_role', fn (Builder $query) => $query->where('role', 'admin'));

        static::creating(function (self $admin): void {
            $admin->role = 'admin';
        });
    }

    public function logIn(): bool
    {
        return $this->signIn();
    }

    public function desconnect(): bool
    {
        return $this->siignOut();
    }

    public function ajouterEleve(array $attributes): Student
    {
        return Student::create($attributes);
    }

    public function ajouterParent(array $attributes): ParentAccount
    {
        return ParentAccount::create($attributes);
    }

    public function ajouterBus(array $attributes): Bus
    {
        return Bus::create($attributes);
    }

    public function ajouterAdmin(array $attributes): self
    {
        return self::create($attributes);
    }

    public function voirListDesBus()
    {
        return Bus::query()->orderBy('bus_name')->get();
    }

    public function deleteUser(Utilisateur $user): bool
    {
        return (bool) $user->delete();
    }
}
