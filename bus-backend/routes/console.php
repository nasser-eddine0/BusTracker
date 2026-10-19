<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\FirebaseMembershipSynchronizer;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('firebase:dispatch-membership-syncs {--limit=100}', function (FirebaseMembershipSynchronizer $synchronizer) {
    $count = $synchronizer->dispatchDue(max(1, min(1000, (int) $this->option('limit'))));
    $this->info("Dispatched {$count} Firebase membership synchronization record(s).");
})->purpose('Dispatch due Firebase membership synchronization records for recovery');
