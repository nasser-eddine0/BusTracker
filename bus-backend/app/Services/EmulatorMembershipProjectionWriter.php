<?php

namespace App\Services;

use App\Contracts\MembershipProjectionWriter;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class EmulatorMembershipProjectionWriter implements MembershipProjectionWriter
{
    private string $baseUrl;

    public function __construct()
    {
        if (! in_array(app()->environment(), ['testing', 'local'], true)) {
            throw new RuntimeException('The Firebase emulator membership writer is not allowed in production.');
        }

        $host = (string) config('services.firebase.database_emulator_host');
        $databaseUrl = (string) config('services.firebase.database_url');
        if (! is_string(config('services.firebase.emulator_token')) || config('services.firebase.emulator_token') === '') {
            throw new RuntimeException('The Firebase emulator writer requires an explicit emulator token.');
        }
        if (! str_starts_with($databaseUrl, 'http://')) {
            throw new RuntimeException('The Firebase emulator writer requires an HTTP database URL.');
        }
        if (! preg_match('/^127\\.0\\.0\\.1(?::\\d+)?$/', $host)) {
            throw new RuntimeException('The Firebase emulator writer requires a loopback database emulator host.');
        }

        $project = (string) config('services.firebase.project_id', 'demo-bustracker');
        $namespace = rawurlencode($project.'-default-rtdb');
        $this->baseUrl = 'http://'.$host.'/';
        $this->namespace = $namespace;
    }

    private string $namespace;

    public function set(int $schoolId, int $userId, array $payload): void
    {
        $this->request("school_users/{$schoolId}/{$userId}", $payload);
    }

    public function deactivate(int $schoolId, int $userId, array $payload): void
    {
        $this->set($schoolId, $userId, $payload);
    }

    public function removeSchool(int $schoolId): void
    {
        $this->request("school_users/{$schoolId}", null);
    }

    private function request(string $path, ?array $payload): void
    {
        $response = Http::withToken((string) config('services.firebase.emulator_token'))
            ->put($this->baseUrl.$path.'.json?ns='.$this->namespace, $payload);
        $response->throw();
    }
}
