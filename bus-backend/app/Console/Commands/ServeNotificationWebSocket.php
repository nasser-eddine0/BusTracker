<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Sanctum\PersonalAccessToken;

class ServeNotificationWebSocket extends Command
{
    protected $signature = 'notifications:serve {--host=127.0.0.1} {--port=8081}';

    protected $description = 'Serve notification updates over a lightweight WebSocket server.';

    public function handle(): int
    {
        $host = (string) $this->option('host');
        $port = (int) $this->option('port');
        $server = @stream_socket_server("tcp://{$host}:{$port}", $errorCode, $errorMessage);

        if (!$server) {
            $this->error("Unable to start WebSocket server: {$errorMessage}");
            return self::FAILURE;
        }

        stream_set_blocking($server, false);
        $this->info("Notification WebSocket server listening on ws://{$host}:{$port}");

        $clients = [];
        $broadcastPath = storage_path('app/notification-broadcasts.log');
        if (!file_exists($broadcastPath)) {
            touch($broadcastPath);
        }
        $cursor = filesize($broadcastPath) ?: 0;

        while (true) {
            $readSockets = [$server];
            foreach ($clients as $client) {
                $readSockets[] = $client['socket'];
            }

            $write = null;
            $except = null;
            @stream_select($readSockets, $write, $except, 0, 200000);

            foreach ($readSockets as $socket) {
                if ($socket === $server) {
                    $connection = @stream_socket_accept($server, 0);
                    if (!$connection) {
                        continue;
                    }

                    stream_set_blocking($connection, false);
                    $id = (int) $connection;
                    $clients[$id] = [
                        'socket' => $connection,
                        'handshake' => false,
                        'user_id' => null,
                    ];
                    continue;
                }

                $id = (int) $socket;
                $buffer = @fread($socket, 8192);

                if ($buffer === '' || $buffer === false) {
                    if (feof($socket)) {
                        fclose($socket);
                        unset($clients[$id]);
                    }
                    continue;
                }

                if (!$clients[$id]['handshake']) {
                    if ($this->performHandshake($socket, $buffer)) {
                        $clients[$id]['handshake'] = true;
                    }
                    continue;
                }

                $payload = $this->decodeFrame($buffer);
                if (!$payload) {
                    continue;
                }

                $message = json_decode($payload, true);
                if (!is_array($message)) {
                    continue;
                }

                if (($message['type'] ?? null) === 'auth' && !empty($message['token'])) {
                    $userId = $this->resolveUserIdFromToken((string) $message['token']);
                    if (!$userId) {
                        fwrite($socket, $this->encodeFrame(json_encode([
                            'type' => 'error',
                            'message' => 'Authentication failed.',
                        ])));
                        fclose($socket);
                        unset($clients[$id]);
                        continue;
                    }

                    $clients[$id]['user_id'] = (string) $userId;
                    fwrite($socket, $this->encodeFrame(json_encode([
                        'type' => 'ready',
                        'userId' => (string) $userId,
                    ])));
                }
            }

            clearstatcache(true, $broadcastPath);
            $currentSize = filesize($broadcastPath) ?: 0;
            if ($currentSize < $cursor) {
                $cursor = 0;
            }

            if ($currentSize > $cursor) {
                $handle = fopen($broadcastPath, 'rb');
                if ($handle) {
                    fseek($handle, $cursor);
                    while (($line = fgets($handle)) !== false) {
                        $event = json_decode(trim($line), true);
                        if (!is_array($event)) {
                            continue;
                        }

                        foreach ($clients as $client) {
                            if (!$client['user_id'] || $client['user_id'] !== ($event['recipientUserId'] ?? null)) {
                                continue;
                            }

                            @fwrite($client['socket'], $this->encodeFrame(json_encode([
                                'type' => 'notification',
                                'notification' => $event,
                            ])));
                        }
                    }
                    $cursor = ftell($handle) ?: $currentSize;
                    fclose($handle);
                }
            }
        }
    }

    private function performHandshake($socket, string $request): bool
    {
        if (!preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $request, $matches)) {
            return false;
        }

        $key = trim($matches[1]);
        $accept = base64_encode(
            pack(
                'H*',
                sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            )
        );

        $response = "HTTP/1.1 101 Switching Protocols\r\n"
            . "Upgrade: websocket\r\n"
            . "Connection: Upgrade\r\n"
            . "Sec-WebSocket-Accept: {$accept}\r\n\r\n";

        fwrite($socket, $response);
        return true;
    }

    private function decodeFrame(string $data): ?string
    {
        $length = ord($data[1]) & 127;
        $maskOffset = 2;

        if ($length === 126) {
            $maskOffset = 4;
            $length = unpack('n', substr($data, 2, 2))[1];
        } elseif ($length === 127) {
            $maskOffset = 10;
            $length = unpack('J', substr($data, 2, 8))[1];
        }

        $masks = substr($data, $maskOffset, 4);
        $payload = substr($data, $maskOffset + 4, $length);
        $decoded = '';

        for ($i = 0; $i < $length; $i++) {
            $decoded .= $payload[$i] ^ $masks[$i % 4];
        }

        return $decoded;
    }

    private function encodeFrame(string $payload): string
    {
        $length = strlen($payload);
        $frame = chr(129);

        if ($length <= 125) {
            $frame .= chr($length);
        } elseif ($length <= 65535) {
            $frame .= chr(126) . pack('n', $length);
        } else {
            $frame .= chr(127) . pack('J', $length);
        }

        return $frame . $payload;
    }

    private function resolveUserIdFromToken(string $rawToken): ?int
    {
        if (!str_contains($rawToken, '|')) {
            return null;
        }

        [$tokenId, $tokenValue] = explode('|', $rawToken, 2);
        $accessToken = PersonalAccessToken::find($tokenId);

        if (!$accessToken) {
            return null;
        }

        if (!hash_equals($accessToken->token, hash('sha256', $tokenValue))) {
            return null;
        }

        return (int) $accessToken->tokenable_id;
    }
}
