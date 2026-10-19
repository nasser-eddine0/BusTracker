<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\School;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use InvalidArgumentException;

class AuditLogger
{
    public function log(array $data): AuditLog
    {
        foreach (['action', 'description'] as $requiredField) {
            if (blank($data[$requiredField] ?? null)) {
                throw new InvalidArgumentException("Audit log field [{$requiredField}] is required.");
            }
        }

        $auditable = $data['auditable'] ?? null;
        if ($auditable !== null && !$auditable instanceof Model) {
            throw new InvalidArgumentException('Audit log [auditable] must be an Eloquent model.');
        }

        $request = request();
        $severity = $data['severity'] ?? 'info';
        if (!in_array($severity, ['info', 'warning', 'critical'], true)) {
            throw new InvalidArgumentException('Audit log [severity] must be info, warning, or critical.');
        }

        return AuditLog::create([
            'user_id' => $data['user_id'] ?? $request->user()?->id,
            'school_id' => $this->resolveSchoolId($auditable, $data),
            'action' => $data['action'],
            'severity' => $severity,
            'description' => $data['description'],
            'auditable_type' => $auditable ? $auditable::class : null,
            'auditable_id' => $auditable?->getKey(),
            'old_values' => Arr::get($data, 'old_values'),
            'new_values' => Arr::get($data, 'new_values'),
            'ip_address' => $data['ip_address'] ?? $request->ip(),
            'user_agent' => $data['user_agent'] ?? $request->userAgent(),
        ]);
    }

    private function resolveSchoolId(?Model $auditable, array $data): ?int
    {
        if (array_key_exists('school_id', $data) && $data['school_id']) {
            return (int) $data['school_id'];
        }

        if ($auditable instanceof School) {
            return (int) $auditable->id;
        }

        return isset($auditable?->school_id) ? (int) $auditable->school_id : null;
    }
}
