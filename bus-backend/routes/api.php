<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\TripController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/bootstrap', [AdminController::class, 'bootstrap']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::put('/users/{user}', [AdminController::class, 'updateUser']);
        Route::post('/users/{user}/disable', [AdminController::class, 'disableUser']);
        Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);

        Route::post('/students', [AdminController::class, 'storeStudent']);
        Route::put('/students/{student}', [AdminController::class, 'updateStudent']);
        Route::post('/students/import-preview', [AdminController::class, 'importPreviewRows']);

        Route::post('/buses', [AdminController::class, 'storeBus']);
        Route::put('/buses/{bus}', [AdminController::class, 'updateBus']);

        Route::post('/assignments', [AdminController::class, 'assignStudents']);
    });

    Route::middleware('role:driver')->prefix('driver')->group(function () {
        Route::get('/dashboard', [DriverController::class, 'dashboard']);
        Route::post('/trip/start', [TripController::class, 'start']);
    });

    Route::middleware('role:driver')->post('/trips/{trip}/finalize', [TripController::class, 'finalize']);

    Route::middleware('role:parent')->prefix('parent')->group(function () {
        Route::get('/dashboard', [ParentController::class, 'dashboard']);
        Route::post('/link-child', [ParentController::class, 'linkChild']);
        Route::post('/absence', [ParentController::class, 'declareAbsence']);
        Route::get('/notifications', [ParentController::class, 'notifications']);
    });
});
