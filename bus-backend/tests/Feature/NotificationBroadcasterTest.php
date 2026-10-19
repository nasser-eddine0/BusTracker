<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationBroadcaster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationBroadcasterTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_broadcast_log_contains_no_sensitive_notification_data(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'bus-tracker-notification-log-');
        config([
            'logging.channels.notification_broadcast.driver' => 'single',
            'logging.channels.notification_broadcast.path' => $path,
        ]);

        $recipient = User::factory()->create();
        $notification = Notification::create([
            'recipient_user_id' => $recipient->id,
            'parent_id' => $recipient->id,
            'type' => 'absence_declared',
            'title' => 'Private title',
            'message' => 'Private child message',
            'payload' => ['private' => 'value'],
        ]);

        try {
            app(NotificationBroadcaster::class)->broadcast($notification);
            $log = file_get_contents($path);

            $this->assertStringContainsString((string) $notification->id, $log);
            $this->assertStringNotContainsString('recipientUserId', $log);
            $this->assertStringNotContainsString('studentId', $log);
            $this->assertStringNotContainsString('Private child message', $log);
            $this->assertStringNotContainsString('private', $log);
        } finally {
            @unlink($path);
        }
    }
}
