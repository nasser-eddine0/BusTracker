<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToSchool
{
    public static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school', function (Builder $builder): void {
            if (auth()->check() && auth()->user()?->role !== 'super_admin') {
                $builder->where($builder->getModel()->getTable().'.school_id', auth()->user()->school_id);
            }
        });

        static::creating(function ($model): void {
            if (auth()->check() && auth()->user()?->role !== 'super_admin') {
                $model->school_id = auth()->user()->school_id;
            }
        });
    }
}
