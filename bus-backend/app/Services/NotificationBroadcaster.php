<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationBroadcaster
{
    public function broadcast(Notification $notification): void
    {
        Log::channel('notification_broadcast')->info('notification.broadcasted', [
            'notification_id' => (int) $notification->id,
            'correlation_id' => (string) Str::uuid(),
        ]);
    }
}
