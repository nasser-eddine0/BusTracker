<?php

namespace App\Services;

use App\Contracts\MembershipProjectionWriter;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class EmulatorMembershipProjectionWriter implements MembershipProjectionWriter
{
    private string $baseUrl;

    private string $databaseHost;

    private string $project;

    private ?array $lastDiagnostic = null;

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
        $this->databaseHost = $host;
        $this->project = $project;
        $this->namespace = $namespace;
    }

    private string $namespace;

    public function set(int $schoolId, int $userId, array $payload): void
    {
        $path = "school_users/{$schoolId}/{$userId}";
        $this->request($path, $payload);

        if (app()->environment('testing')) {
            $readBack = $this->request($path, null, 'GET');
            $this->lastDiagnostic = $this->diagnostic($path, $payload, is_array($readBack) ? $readBack : []);
        }
    }

    public function deactivate(int $schoolId, int $userId, array $payload): void
    {
        $this->set($schoolId, $userId, $payload);
    }

    public function removeSchool(int $schoolId): void
    {
        $this->request("school_users/{$schoolId}", null);
    }

    public function lastDiagnostic(): ?array
    {
        return $this->lastDiagnostic;
    }

    private function request(string $path, ?array $payload, string $method = 'PUT'): mixed
    {
        $request = Http::withToken((string) config('services.firebase.emulator_token'));
        $url = $this->baseUrl.$path.'.json?ns='.$this->namespace;
        $response = $method === 'GET'
            ? $request->get($url)
            : $request->put($url, $payload);
        $response->throw();

        return $response->json();
    }

    private function diagnostic(string $path, array $payload, array $readBack): array
    {
        return [
            'writer' => 'emulator-rest',
            'project_id' => $this->project,
            'database_host' => $this->databaseHost,
            'namespace' => rawurldecode($this->namespace),
            'membership_path' => $path,
            'desired_active' => $payload['active'] ?? null,
            'desired_role' => $payload['role'] ?? null,
            'desired_allowed_bus_keys' => array_map('strval', array_keys((array) ($payload['allowedBusIds'] ?? []))),
            'read_back_active' => $readBack['active'] ?? null,
            'read_back_role' => $readBack['role'] ?? null,
            'read_back_allowed_bus_keys' => array_map('strval', array_keys((array) ($readBack['allowedBusIds'] ?? []))),
            'operation_id' => 'membership-'.bin2hex(random_bytes(8)),
            'observed_at' => now()->toISOString(),
        ];
    }
}
