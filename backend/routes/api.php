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
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\AttendanceTimeEditRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SettingsController;

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

    // Attendance check-in/out
    Route::get('/attendance/today', [AttendanceController::class, 'today']);
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::get('/attendance/calendar', [AttendanceController::class, 'calendar']);
    Route::get('/attendance/summary', [AttendanceController::class, 'summary']);

    // Leave requests
    Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
    Route::patch('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']);
    Route::patch('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']);

    // Attendance time edit requests (overtime/manual adjustments)
    Route::get('/attendance-time-edit-requests', [AttendanceTimeEditRequestController::class, 'index']);
    Route::post('/attendance-time-edit-requests', [AttendanceTimeEditRequestController::class, 'store']);
    Route::patch('/attendance-time-edit-requests/{id}/approve', [AttendanceTimeEditRequestController::class, 'approve']);
    Route::patch('/attendance-time-edit-requests/{id}/reject', [AttendanceTimeEditRequestController::class, 'reject']);

    // Payroll
    Route::get('/payroll/structures', [PayrollController::class, 'structures']);
    Route::post('/payroll/structures', [PayrollController::class, 'upsertStructure']);
    Route::get('/payroll/payslips', [PayrollController::class, 'payslips']);
    Route::post('/payroll/payslips/generate', [PayrollController::class, 'generatePayslip']);
    Route::put('/payroll/structures/{id}', [PayrollController::class, 'updateStructure']);
    Route::delete('/payroll/structures/{id}', [PayrollController::class, 'deleteStructure']);
    Route::post('/payroll/payslips/pay-now', [PayrollController::class, 'payNow']);
    Route::get('/payroll/payslips/{id}', [PayrollController::class, 'showPayslip']);
    Route::get('/payroll/payslips/{id}/pdf', [PayrollController::class, 'downloadPayslipPdf']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/publish', [NotificationController::class, 'publish']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Settings
    Route::get('/settings/me', [SettingsController::class, 'me']);
    Route::put('/settings/profile', [SettingsController::class, 'updateProfile']);
    Route::put('/settings/password', [SettingsController::class, 'updatePassword']);
    Route::put('/settings/preferences', [SettingsController::class, 'updatePreferences']);
    Route::put('/settings/organization', [SettingsController::class, 'updateOrganization']);
    Route::get('/settings/billing', [SettingsController::class, 'billing']);
    
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
