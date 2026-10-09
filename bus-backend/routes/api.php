<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\SchoolAdmin\BillingController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\SuperAdmin\AuditLogController;
use App\Http\Controllers\Api\SuperAdmin\SchoolController;
use App\Http\Controllers\Api\TripController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle.role:5,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

Route::middleware(['auth:sanctum', 'school.owner'])->group(function () {
    Route::middleware(['role:driver', 'school.active', 'subscription.active'])->post('/driver/trip/ping-location', [TripController::class, 'pingLocation'])->middleware('throttle.role:120,1');

    Route::middleware('throttle.role:60,1')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/chat', [ChatController::class, 'sendMessage']);
    Route::get('/firebase-token', [AuthController::class, 'firebaseToken']);

    Route::middleware('super_admin')->prefix('super-admin')->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/schools', [SchoolController::class, 'index']);
        Route::get('/admins', [SchoolController::class, 'indexAdmins']);
        Route::post('/schools', [SchoolController::class, 'store']);
        Route::put('/schools/{school}', [SchoolController::class, 'update']);
        Route::patch('/schools/{school}/toggle-status', [SchoolController::class, 'toggleStatus']);
        Route::post('/schools/{school}/admins', [SchoolController::class, 'storeAdmin']);
        Route::put('/admins/{user}', [SchoolController::class, 'updateAdmin']);
    });

    Route::middleware(['role:admin', 'school.active', 'subscription.active'])->prefix('admin')->group(function () {
        Route::get('/bootstrap', [AdminController::class, 'bootstrap']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::put('/users/{user}', [AdminController::class, 'updateUser']);
        Route::post('/users/{user}/disable', [AdminController::class, 'disableUser']);
        Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);

        Route::post('/students', [AdminController::class, 'storeStudent']);
        Route::put('/students/{student}', [AdminController::class, 'updateStudent']);
        Route::delete('/students/{student}', [AdminController::class, 'destroyStudent']);
        Route::post('/students/bulk-delete', [AdminController::class, 'bulkDestroyStudents']);
        Route::post('/students/import-preview', [AdminController::class, 'importPreviewRows']);
        Route::post('/students/parse-import-headers', [AdminController::class, 'parseImportHeaders']);
        Route::post('/students/finalize-import', [AdminController::class, 'finalizeImport']);

        Route::post('/users/bulk-delete', [AdminController::class, 'bulkDestroyUsers']);

        Route::post('/buses', [AdminController::class, 'storeBus']);
        Route::put('/buses/{bus}', [AdminController::class, 'updateBus']);
        Route::delete('/buses/{bus}', [AdminController::class, 'destroyBus']);
        Route::post('/buses/bulk-delete', [AdminController::class, 'bulkDestroyBuses']);

        Route::post('/assignments', [AdminController::class, 'assignStudents']);
    });

    Route::middleware(['role:admin', 'school.active'])->prefix('admin/billing')->group(function () {
        Route::get('/status', [BillingController::class, 'status']);
        Route::post('/subscribe', [BillingController::class, 'subscribe']);
        Route::post('/portal', [BillingController::class, 'portal']);
    });

    Route::middleware(['role:driver', 'school.active', 'subscription.active'])->prefix('driver')->group(function () {
        Route::get('/dashboard', [DriverController::class, 'dashboard']);
        Route::post('/trip/start', [TripController::class, 'start']);
        Route::post('/trip/nudge-parent', [TripController::class, 'nudgeParent']);
        Route::post('/students/{student}/status', [DriverController::class, 'updateStudentStatus']);
        Route::get('/notifications', [DriverController::class, 'notifications']);
        Route::post('/notifications/mark-read', [DriverController::class, 'markNotificationsRead']);
    });

    Route::middleware(['role:driver', 'school.active', 'subscription.active'])->post('/trips/{trip}/finalize', [TripController::class, 'finalize']);

    Route::middleware(['role:parent', 'school.active', 'subscription.active'])->prefix('parent')->group(function () {
        Route::get('/dashboard', [ParentController::class, 'dashboard']);
        Route::post('/link-child', [ParentController::class, 'linkChild']);
        Route::post('/absence', [ParentController::class, 'declareAbsence']);
        Route::post('/ready', [ParentController::class, 'declareReady']);
        Route::post('/confirm-location', [ParentController::class, 'confirmLocation']);
        Route::get('/notifications', [ParentController::class, 'notifications']);
        Route::post('/notifications/mark-read', [ParentController::class, 'markNotificationsRead']);
    });
    });
});
