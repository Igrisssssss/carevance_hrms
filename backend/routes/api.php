<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TimeEntryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScreenshotController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ChatController;

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('api.token')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Organizations
    Route::apiResource('organizations', OrganizationController::class);
    Route::get('/organizations/{id}/members', [OrganizationController::class, 'members']);
    Route::post('/organizations/{id}/invite', [OrganizationController::class, 'invite']);
    
    // Projects
    Route::apiResource('projects', ProjectController::class);
    Route::get('/projects/{id}/time-entries', [ProjectController::class, 'timeEntries']);
    Route::get('/projects/{id}/tasks', [ProjectController::class, 'tasks']);
    Route::get('/projects/{id}/stats', [ProjectController::class, 'stats']);
    
    // Tasks
    Route::apiResource('tasks', TaskController::class);
    Route::patch('/tasks/{task}/status', [TaskController::class, 'updateStatus']);
    Route::get('/tasks/{id}/time-entries', [TaskController::class, 'timeEntries']);
    
    // Time Entries
    Route::post('/time-entries/start', [TimeEntryController::class, 'start']);
    Route::post('/time-entries/stop', [TimeEntryController::class, 'stop']);
    Route::get('/time-entries/active', [TimeEntryController::class, 'active']);
    Route::get('/time-entries/today', [TimeEntryController::class, 'today']);
    Route::apiResource('time-entries', TimeEntryController::class);
    
    // Screenshots
    Route::apiResource('screenshots', ScreenshotController::class);
    
    // Activities
    Route::apiResource('activities', ActivityController::class);
    
    // Users
    Route::apiResource('users', UserController::class);
    Route::get('/users/{id}/stats', [UserController::class, 'stats']);

    // Private chat
    Route::get('/chat/conversations', [ChatController::class, 'conversations']);
    Route::get('/chat/unread-summary', [ChatController::class, 'unreadSummary']);
    Route::post('/chat/conversations', [ChatController::class, 'startConversation']);
    Route::get('/chat/conversations/{conversationId}/messages', [ChatController::class, 'messages']);
    Route::post('/chat/conversations/{conversationId}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/chat/conversations/{conversationId}/read', [ChatController::class, 'markRead']);
    Route::post('/chat/conversations/{conversationId}/typing', [ChatController::class, 'setTyping']);
    Route::get('/chat/conversations/{conversationId}/typing', [ChatController::class, 'typingStatus']);
    Route::get('/chat/messages/{messageId}/attachment', [ChatController::class, 'attachment']);
    
    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('/invoices/{id}/send', [InvoiceController::class, 'send']);
    Route::post('/invoices/{id}/mark-paid', [InvoiceController::class, 'markPaid']);
    
    // Reports
    Route::get('/dashboard', [ReportController::class, 'dashboard']);
    Route::get('/reports/daily', [ReportController::class, 'daily']);
    Route::get('/reports/weekly', [ReportController::class, 'weekly']);
    Route::get('/reports/monthly', [ReportController::class, 'monthly']);
    Route::get('/reports/productivity', [ReportController::class, 'productivity']);
    Route::get('/reports/team', [ReportController::class, 'team']);
    Route::get('/reports/attendance', [ReportController::class, 'attendance']);
    Route::get('/reports/employee-insights', [ReportController::class, 'employeeInsights']);
    Route::get('/reports/overall', [ReportController::class, 'overall']);
    Route::get('/reports/project/{projectId}', [ReportController::class, 'project']);
    Route::get('/reports/export', [ReportController::class, 'export']);
});
