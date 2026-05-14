<?php

namespace App\Services;

use App\Models\Notification;

class NotificationBroadcaster
{
    public function broadcast(Notification $notification): void
    {
        $path = storage_path('app/notification-broadcasts.log');

        $payload = [
            'id' => (string) $notification->id,
            'recipientUserId' => (string) $notification->recipient_user_id,
            'parentId' => $notification->parent_id ? (string) $notification->parent_id : null,
            'studentId' => $notification->student_id ? (string) $notification->student_id : null,
            'busId' => $notification->bus_id ? (string) $notification->bus_id : null,
            'tripId' => $notification->trip_id ? (string) $notification->trip_id : null,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'payload' => $notification->payload,
            'read' => $notification->read_at !== null,
            'createdAt' => optional($notification->date_envoi ?? $notification->created_at)->toIso8601String(),
        ];

        file_put_contents($path, json_encode($payload) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
