<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:120'],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = AuditLog::query()
            ->with(['user:id,name,email,role', 'school:id,name,subdomain'])
            ->when($validated['action'] ?? null, fn ($query, $action) => $query->where('action', $action))
            ->when($validated['school_id'] ?? null, fn ($query, $schoolId) => $query->where('school_id', $schoolId))
            ->when($validated['user_id'] ?? null, fn ($query, $userId) => $query->where('user_id', $userId))
            ->when($validated['date_from'] ?? null, fn ($query, $dateFrom) => $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay()))
            ->when($validated['date_to'] ?? null, fn ($query, $dateTo) => $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay()))
            ->latest()
            ->paginate($validated['limit'] ?? 20);

        return response()->json($logs);
    }
}
