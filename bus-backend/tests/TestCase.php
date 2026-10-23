<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    private static bool $postgresEnvironmentVerified = false;

    protected function beforeRefreshingDatabase()
    {
        if (getenv('POSTGRES_VERIFICATION_GUARD') !== '1' || self::$postgresEnvironmentVerified) {
            return;
        }

        $guard = require __DIR__.'/bootstrap-postgres.php';
        $guard($this->app);

        self::$postgresEnvironmentVerified = true;
    }
}
