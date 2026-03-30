# Backend Route Test Matrix

- Generated at: 2026-03-20T12:27:53+00:00
- Matching strategy: heuristic matching from `*Json()` calls in tests to route method + URI shape.

## Summary

- Total routes: 156
- API routes analyzed: 153
- Heuristically covered API routes: 51
- Heuristically uncovered API routes: 102
- Heuristic API coverage: 33.33%

## Controller Coverage (API Only)

| Controller | Covered | Total | Coverage |
| --- | ---: | ---: | ---: |
| AuditLogController | 0 | 1 | 0.00% |
| DesktopDownloadController | 0 | 1 | 0.00% |
| CompanyController | 0 | 1 | 0.00% |
| InviteController | 0 | 3 | 0.00% |
| ReportGroupController | 0 | 4 | 0.00% |
| ActivityController | 0 | 5 | 0.00% |
| InvoiceController | 0 | 7 | 0.00% |
| TaskController | 0 | 7 | 0.00% |
| ProjectController | 0 | 8 | 0.00% |
| OrganizationController | 1 | 7 | 14.29% |
| UserController | 1 | 7 | 14.29% |
| PayrollController | 4 | 19 | 21.05% |
| ScreenshotController | 2 | 8 | 25.00% |
| LeaveRequestController | 2 | 7 | 28.57% |
| TimeEntryController | 3 | 9 | 33.33% |
| ReportController | 4 | 11 | 36.36% |
| AttendanceController | 2 | 5 | 40.00% |
| AttendanceTimeEditRequestController | 2 | 4 | 50.00% |
| ChatController | 11 | 18 | 61.11% |
| InvitationController | 3 | 4 | 75.00% |
| AuthController | 5 | 6 | 83.33% |
| BillingController | 1 | 1 | 100.00% |
| NotificationController | 4 | 4 | 100.00% |
| SettingsController | 6 | 6 | 100.00% |

## API Route Matrix

| Status | Method | URI | Action | Matched Tests |
| --- | --- | --- | --- | --- |
| Uncovered | `GET` | `/api/activities` | `App\Http\Controllers\Api\ActivityController@index` | - |
| Uncovered | `POST` | `/api/activities` | `App\Http\Controllers\Api\ActivityController@store` | - |
| Uncovered | `GET` | `/api/activities/{activity}` | `App\Http\Controllers\Api\ActivityController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/activities/{activity}` | `App\Http\Controllers\Api\ActivityController@update` | - |
| Uncovered | `DELETE` | `/api/activities/{activity}` | `App\Http\Controllers\Api\ActivityController@destroy` | - |
| Uncovered | `GET` | `/api/attendance-time-edit-requests` | `App\Http\Controllers\Api\AttendanceTimeEditRequestController@index` | - |
| Covered | `POST` | `/api/attendance-time-edit-requests` | `App\Http\Controllers\Api\AttendanceTimeEditRequestController@store` | `tests\Feature\TimeEditNotificationFlowTest.php` |
| Uncovered | `PATCH` | `/api/attendance-time-edit-requests/{id}/approve` | `App\Http\Controllers\Api\AttendanceTimeEditRequestController@approve` | - |
| Covered | `PATCH` | `/api/attendance-time-edit-requests/{id}/reject` | `App\Http\Controllers\Api\AttendanceTimeEditRequestController@reject` | `tests\Feature\TimeEditNotificationFlowTest.php` |
| Uncovered | `GET` | `/api/attendance/calendar` | `App\Http\Controllers\Api\AttendanceController@calendar` | - |
| Covered | `POST` | `/api/attendance/check-in` | `App\Http\Controllers\Api\AttendanceController@checkIn` | `tests\Feature\AttendanceAndTimerFlowTest.php` |
| Covered | `POST` | `/api/attendance/check-out` | `App\Http\Controllers\Api\AttendanceController@checkOut` | `tests\Feature\AttendanceAndTimerFlowTest.php` |
| Uncovered | `GET` | `/api/attendance/summary` | `App\Http\Controllers\Api\AttendanceController@summary` | - |
| Uncovered | `GET` | `/api/attendance/today` | `App\Http\Controllers\Api\AttendanceController@today` | - |
| Uncovered | `GET` | `/api/audit-logs` | `App\Http\Controllers\Api\AuditLogController@index` | - |
| Uncovered | `POST` | `/api/auth/handoff` | `App\Http\Controllers\Api\AuthController@handoff` | - |
| Covered | `POST` | `/api/auth/login` | `App\Http\Controllers\Api\AuthController@login` | `tests\Feature\AuthApiTest.php` |
| Covered | `POST` | `/api/auth/logout` | `App\Http\Controllers\Api\AuthController@logout` | `tests\Feature\AuthApiTest.php` |
| Covered | `GET` | `/api/auth/me` | `App\Http\Controllers\Api\AuthController@user` | `tests\Feature\AuthApiTest.php` |
| Covered | `POST` | `/api/auth/register` | `App\Http\Controllers\Api\AuthController@register` | `tests\Feature\OwnerSignupApiTest.php` |
| Covered | `POST` | `/api/auth/signup-owner` | `App\Http\Controllers\Api\AuthController@signupOwner` | `tests\Feature\OwnerSignupApiTest.php` |
| Covered | `GET` | `/api/billing/current` | `App\Http\Controllers\Api\BillingController@current` | `tests\Feature\OwnerSignupApiTest.php` |
| Uncovered | `GET` | `/api/chat/available-users` | `App\Http\Controllers\Api\ChatController@availableUsers` | - |
| Uncovered | `GET` | `/api/chat/conversations` | `App\Http\Controllers\Api\ChatController@conversations` | - |
| Covered | `POST` | `/api/chat/conversations` | `App\Http\Controllers\Api\ChatController@startConversation` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `GET` | `/api/chat/conversations/{conversationId}/messages` | `App\Http\Controllers\Api\ChatController@messages` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `POST` | `/api/chat/conversations/{conversationId}/messages` | `App\Http\Controllers\Api\ChatController@sendMessage` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `POST` | `/api/chat/conversations/{conversationId}/read` | `App\Http\Controllers\Api\ChatController@markRead` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `POST` | `/api/chat/conversations/{conversationId}/typing` | `App\Http\Controllers\Api\ChatController@setTyping` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `GET` | `/api/chat/conversations/{conversationId}/typing` | `App\Http\Controllers\Api\ChatController@typingStatus` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `GET` | `/api/chat/groups` | `App\Http\Controllers\Api\ChatController@groups` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `POST` | `/api/chat/groups` | `App\Http\Controllers\Api\ChatController@createGroup` | `tests\Feature\ChatApiFlowTest.php` |
| Uncovered | `GET` | `/api/chat/groups/messages/{messageId}/attachment` | `App\Http\Controllers\Api\ChatController@groupAttachment` | - |
| Uncovered | `GET` | `/api/chat/groups/{groupId}/messages` | `App\Http\Controllers\Api\ChatController@groupMessages` | - |
| Covered | `POST` | `/api/chat/groups/{groupId}/messages` | `App\Http\Controllers\Api\ChatController@sendGroupMessage` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `POST` | `/api/chat/groups/{groupId}/read` | `App\Http\Controllers\Api\ChatController@markGroupRead` | `tests\Feature\ChatApiFlowTest.php` |
| Uncovered | `POST` | `/api/chat/groups/{groupId}/typing` | `App\Http\Controllers\Api\ChatController@setGroupTyping` | - |
| Uncovered | `GET` | `/api/chat/groups/{groupId}/typing` | `App\Http\Controllers\Api\ChatController@groupTypingStatus` | - |
| Uncovered | `GET` | `/api/chat/messages/{messageId}/attachment` | `App\Http\Controllers\Api\ChatController@attachment` | - |
| Covered | `GET` | `/api/chat/unread-summary` | `App\Http\Controllers\Api\ChatController@unreadSummary` | `tests\Feature\ChatApiFlowTest.php` |
| Covered | `GET` | `/api/dashboard` | `App\Http\Controllers\Api\ReportController@dashboard` | `tests\Feature\AuthApiTest.php`, `tests\Feature\ReportWorkingTimeTest.php` |
| Uncovered | `GET` | `/api/downloads/desktop/windows` | `App\Http\Controllers\Api\DesktopDownloadController@windows` | - |
| Uncovered | `GET` | `/api/invitations` | `App\Http\Controllers\Api\InvitationController@index` | - |
| Covered | `POST` | `/api/invitations` | `App\Http\Controllers\Api\InvitationController@store` | `tests\Feature\InvitationFlowTest.php` |
| Covered | `GET` | `/api/invitations/{token}` | `App\Http\Controllers\Api\InvitationController@show` | `tests\Feature\InvitationFlowTest.php` |
| Covered | `POST` | `/api/invitations/{token}/accept` | `App\Http\Controllers\Api\InvitationController@accept` | `tests\Feature\InvitationFlowTest.php` |
| Uncovered | `POST` | `/api/invites/accept` | `App\Http\Controllers\Api\InviteController@acceptInvite` | - |
| Uncovered | `POST` | `/api/invites/send` | `App\Http\Controllers\Api\InviteController@sendInvite` | - |
| Uncovered | `GET` | `/api/invites/validate` | `App\Http\Controllers\Api\InviteController@validateInvite` | - |
| Uncovered | `GET` | `/api/invoices` | `App\Http\Controllers\Api\InvoiceController@index` | - |
| Uncovered | `POST` | `/api/invoices` | `App\Http\Controllers\Api\InvoiceController@store` | - |
| Uncovered | `POST` | `/api/invoices/{id}/mark-paid` | `App\Http\Controllers\Api\InvoiceController@markPaid` | - |
| Uncovered | `POST` | `/api/invoices/{id}/send` | `App\Http\Controllers\Api\InvoiceController@send` | - |
| Uncovered | `GET` | `/api/invoices/{invoice}` | `App\Http\Controllers\Api\InvoiceController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/invoices/{invoice}` | `App\Http\Controllers\Api\InvoiceController@update` | - |
| Uncovered | `DELETE` | `/api/invoices/{invoice}` | `App\Http\Controllers\Api\InvoiceController@destroy` | - |
| Uncovered | `GET` | `/api/leave-requests` | `App\Http\Controllers\Api\LeaveRequestController@index` | - |
| Covered | `POST` | `/api/leave-requests` | `App\Http\Controllers\Api\LeaveRequestController@store` | `tests\Feature\AdminAccessAndLeaveApprovalTest.php` |
| Covered | `PATCH` | `/api/leave-requests/{id}/approve` | `App\Http\Controllers\Api\LeaveRequestController@approve` | `tests\Feature\AdminAccessAndLeaveApprovalTest.php` |
| Uncovered | `PATCH` | `/api/leave-requests/{id}/reject` | `App\Http\Controllers\Api\LeaveRequestController@reject` | - |
| Uncovered | `PATCH` | `/api/leave-requests/{id}/revoke-approve` | `App\Http\Controllers\Api\LeaveRequestController@approveRevoke` | - |
| Uncovered | `PATCH` | `/api/leave-requests/{id}/revoke-reject` | `App\Http\Controllers\Api\LeaveRequestController@rejectRevoke` | - |
| Uncovered | `POST` | `/api/leave-requests/{id}/revoke-request` | `App\Http\Controllers\Api\LeaveRequestController@requestRevoke` | - |
| Uncovered | `GET` | `/api/me/company` | `App\Http\Controllers\Api\CompanyController@current` | - |
| Covered | `GET` | `/api/notifications` | `App\Http\Controllers\Api\NotificationController@index` | `tests\Feature\NotificationApiFlowTest.php` |
| Covered | `POST` | `/api/notifications/publish` | `App\Http\Controllers\Api\NotificationController@publish` | `tests\Feature\NotificationApiFlowTest.php` |
| Covered | `POST` | `/api/notifications/read-all` | `App\Http\Controllers\Api\NotificationController@markAllRead` | `tests\Feature\NotificationApiFlowTest.php` |
| Covered | `POST` | `/api/notifications/{id}/read` | `App\Http\Controllers\Api\NotificationController@markRead` | `tests\Feature\NotificationApiFlowTest.php` |
| Uncovered | `GET` | `/api/organizations` | `App\Http\Controllers\Api\OrganizationController@index` | - |
| Uncovered | `POST` | `/api/organizations` | `App\Http\Controllers\Api\OrganizationController@store` | - |
| Covered | `POST` | `/api/organizations/{id}/invite` | `App\Http\Controllers\Api\OrganizationController@invite` | `tests\Feature\OrganizationInviteProtectionTest.php` |
| Uncovered | `GET` | `/api/organizations/{id}/members` | `App\Http\Controllers\Api\OrganizationController@members` | - |
| Uncovered | `GET` | `/api/organizations/{organization}` | `App\Http\Controllers\Api\OrganizationController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/organizations/{organization}` | `App\Http\Controllers\Api\OrganizationController@update` | - |
| Uncovered | `DELETE` | `/api/organizations/{organization}` | `App\Http\Controllers\Api\OrganizationController@destroy` | - |
| Uncovered | `GET` | `/api/payroll/employees` | `App\Http\Controllers\Api\PayrollController@employees` | - |
| Uncovered | `GET` | `/api/payroll/payslips` | `App\Http\Controllers\Api\PayrollController@payslips` | - |
| Uncovered | `POST` | `/api/payroll/payslips/generate` | `App\Http\Controllers\Api\PayrollController@generatePayslip` | - |
| Uncovered | `POST` | `/api/payroll/payslips/pay-now` | `App\Http\Controllers\Api\PayrollController@payNow` | - |
| Uncovered | `GET` | `/api/payroll/payslips/{id}` | `App\Http\Controllers\Api\PayrollController@showPayslip` | - |
| Uncovered | `GET` | `/api/payroll/payslips/{id}/pdf` | `App\Http\Controllers\Api\PayrollController@downloadPayslipPdf` | - |
| Uncovered | `GET` | `/api/payroll/records` | `App\Http\Controllers\Api\PayrollController@records` | - |
| Covered | `POST` | `/api/payroll/records/generate` | `App\Http\Controllers\Api\PayrollController@generateRecords` | `tests\Feature\PayrollWorkflowTest.php` |
| Uncovered | `GET` | `/api/payroll/records/{id}` | `App\Http\Controllers\Api\PayrollController@showRecord` | - |
| Covered | `PATCH` | `/api/payroll/records/{id}` | `App\Http\Controllers\Api\PayrollController@updateRecord` | `tests\Feature\PayrollWorkflowTest.php` |
| Covered | `POST` | `/api/payroll/records/{id}/payout` | `App\Http\Controllers\Api\PayrollController@payoutRecord` | `tests\Feature\PayrollWorkflowTest.php` |
| Covered | `POST` | `/api/payroll/records/{id}/status` | `App\Http\Controllers\Api\PayrollController@updateRecordStatus` | `tests\Feature\PayrollWorkflowTest.php` |
| Uncovered | `POST` | `/api/payroll/records/{id}/sync-stripe-checkout` | `App\Http\Controllers\Api\PayrollController@syncStripeCheckout` | - |
| Uncovered | `GET` | `/api/payroll/records/{id}/transactions` | `App\Http\Controllers\Api\PayrollController@recordTransactions` | - |
| Uncovered | `GET` | `/api/payroll/structures` | `App\Http\Controllers\Api\PayrollController@structures` | - |
| Uncovered | `POST` | `/api/payroll/structures` | `App\Http\Controllers\Api\PayrollController@upsertStructure` | - |
| Uncovered | `PUT` | `/api/payroll/structures/{id}` | `App\Http\Controllers\Api\PayrollController@updateStructure` | - |
| Uncovered | `DELETE` | `/api/payroll/structures/{id}` | `App\Http\Controllers\Api\PayrollController@deleteStructure` | - |
| Uncovered | `POST` | `/api/payroll/webhooks/stripe` | `App\Http\Controllers\Api\PayrollController@stripeWebhook` | - |
| Uncovered | `GET` | `/api/projects` | `App\Http\Controllers\Api\ProjectController@index` | - |
| Uncovered | `POST` | `/api/projects` | `App\Http\Controllers\Api\ProjectController@store` | - |
| Uncovered | `GET` | `/api/projects/{id}/stats` | `App\Http\Controllers\Api\ProjectController@stats` | - |
| Uncovered | `GET` | `/api/projects/{id}/tasks` | `App\Http\Controllers\Api\ProjectController@tasks` | - |
| Uncovered | `GET` | `/api/projects/{id}/time-entries` | `App\Http\Controllers\Api\ProjectController@timeEntries` | - |
| Uncovered | `GET` | `/api/projects/{project}` | `App\Http\Controllers\Api\ProjectController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/projects/{project}` | `App\Http\Controllers\Api\ProjectController@update` | - |
| Uncovered | `DELETE` | `/api/projects/{project}` | `App\Http\Controllers\Api\ProjectController@destroy` | - |
| Uncovered | `GET` | `/api/report-groups` | `App\Http\Controllers\Api\ReportGroupController@index` | - |
| Uncovered | `POST` | `/api/report-groups` | `App\Http\Controllers\Api\ReportGroupController@store` | - |
| Uncovered | `PUT` | `/api/report-groups/{id}` | `App\Http\Controllers\Api\ReportGroupController@update` | - |
| Uncovered | `DELETE` | `/api/report-groups/{id}` | `App\Http\Controllers\Api\ReportGroupController@destroy` | - |
| Uncovered | `GET` | `/api/reports/attendance` | `App\Http\Controllers\Api\ReportController@attendance` | - |
| Uncovered | `GET` | `/api/reports/daily` | `App\Http\Controllers\Api\ReportController@daily` | - |
| Covered | `GET` | `/api/reports/employee-insights` | `App\Http\Controllers\Api\ReportController@employeeInsights` | `tests\Feature\ReportWorkingTimeTest.php` |
| Uncovered | `GET` | `/api/reports/export` | `App\Http\Controllers\Api\ReportController@export` | - |
| Uncovered | `GET` | `/api/reports/monthly` | `App\Http\Controllers\Api\ReportController@monthly` | - |
| Covered | `GET` | `/api/reports/overall` | `App\Http\Controllers\Api\ReportController@overall` | `tests\Feature\AdminAccessAndLeaveApprovalTest.php`, `tests\Feature\ReportWorkingTimeTest.php` |
| Covered | `GET` | `/api/reports/productivity` | `App\Http\Controllers\Api\ReportController@productivity` | `tests\Feature\ReportWorkingTimeTest.php` |
| Uncovered | `GET` | `/api/reports/project/{projectId}` | `App\Http\Controllers\Api\ReportController@project` | - |
| Uncovered | `GET` | `/api/reports/team` | `App\Http\Controllers\Api\ReportController@team` | - |
| Uncovered | `GET` | `/api/reports/weekly` | `App\Http\Controllers\Api\ReportController@weekly` | - |
| Covered | `GET` | `/api/screenshots` | `App\Http\Controllers\Api\ScreenshotController@index` | `tests\Feature\ScreenshotSecurityTest.php` |
| Uncovered | `POST` | `/api/screenshots` | `App\Http\Controllers\Api\ScreenshotController@store` | - |
| Covered | `POST` | `/api/screenshots/bulk-delete` | `App\Http\Controllers\Api\ScreenshotController@bulkDestroy` | `tests\Feature\ScreenshotSecurityTest.php` |
| Uncovered | `GET` | `/api/screenshots/{screenshot}` | `App\Http\Controllers\Api\ScreenshotController@show` | - |
| Uncovered | `PUT` | `/api/screenshots/{screenshot}` | `App\Http\Controllers\Api\ScreenshotController@update` | - |
| Uncovered | `PATCH` | `/api/screenshots/{screenshot}` | `App\Http\Controllers\Api\ScreenshotController@update` | - |
| Uncovered | `DELETE` | `/api/screenshots/{screenshot}` | `App\Http\Controllers\Api\ScreenshotController@destroy` | - |
| Uncovered | `GET` | `/api/screenshots/{screenshot}/file` | `App\Http\Controllers\Api\ScreenshotController@file` | - |
| Covered | `GET` | `/api/settings/billing` | `App\Http\Controllers\Api\SettingsController@billing` | `tests\Feature\SettingsApiFlowTest.php` |
| Covered | `GET` | `/api/settings/me` | `App\Http\Controllers\Api\SettingsController@me` | `tests\Feature\AuthApiTest.php`, `tests\Feature\SettingsApiFlowTest.php` |
| Covered | `PUT` | `/api/settings/organization` | `App\Http\Controllers\Api\SettingsController@updateOrganization` | `tests\Feature\AdminAccessAndLeaveApprovalTest.php`, `tests\Feature\SettingsApiFlowTest.php` |
| Covered | `PUT` | `/api/settings/password` | `App\Http\Controllers\Api\SettingsController@updatePassword` | `tests\Feature\SettingsApiFlowTest.php` |
| Covered | `PUT` | `/api/settings/preferences` | `App\Http\Controllers\Api\SettingsController@updatePreferences` | `tests\Feature\SettingsApiFlowTest.php` |
| Covered | `PUT` | `/api/settings/profile` | `App\Http\Controllers\Api\SettingsController@updateProfile` | `tests\Feature\SettingsApiFlowTest.php` |
| Uncovered | `GET` | `/api/tasks` | `App\Http\Controllers\Api\TaskController@index` | - |
| Uncovered | `POST` | `/api/tasks` | `App\Http\Controllers\Api\TaskController@store` | - |
| Uncovered | `GET` | `/api/tasks/{id}/time-entries` | `App\Http\Controllers\Api\TaskController@timeEntries` | - |
| Uncovered | `GET` | `/api/tasks/{task}` | `App\Http\Controllers\Api\TaskController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/tasks/{task}` | `App\Http\Controllers\Api\TaskController@update` | - |
| Uncovered | `DELETE` | `/api/tasks/{task}` | `App\Http\Controllers\Api\TaskController@destroy` | - |
| Uncovered | `PATCH` | `/api/tasks/{task}/status` | `App\Http\Controllers\Api\TaskController@updateStatus` | - |
| Covered | `GET` | `/api/time-entries` | `App\Http\Controllers\Api\TimeEntryController@index` | `tests\Feature\ReportWorkingTimeTest.php` |
| Uncovered | `POST` | `/api/time-entries` | `App\Http\Controllers\Api\TimeEntryController@store` | - |
| Uncovered | `GET` | `/api/time-entries/active` | `App\Http\Controllers\Api\TimeEntryController@active` | - |
| Covered | `POST` | `/api/time-entries/start` | `App\Http\Controllers\Api\TimeEntryController@start` | `tests\Feature\AttendanceAndTimerFlowTest.php` |
| Covered | `POST` | `/api/time-entries/stop` | `App\Http\Controllers\Api\TimeEntryController@stop` | `tests\Feature\AttendanceAndTimerFlowTest.php` |
| Uncovered | `GET` | `/api/time-entries/today` | `App\Http\Controllers\Api\TimeEntryController@today` | - |
| Uncovered | `GET` | `/api/time-entries/{time_entry}` | `App\Http\Controllers\Api\TimeEntryController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/time-entries/{time_entry}` | `App\Http\Controllers\Api\TimeEntryController@update` | - |
| Uncovered | `DELETE` | `/api/time-entries/{time_entry}` | `App\Http\Controllers\Api\TimeEntryController@destroy` | - |
| Uncovered | `GET` | `/api/users` | `App\Http\Controllers\Api\UserController@index` | - |
| Uncovered | `POST` | `/api/users` | `App\Http\Controllers\Api\UserController@store` | - |
| Covered | `GET` | `/api/users/{id}/profile-360` | `App\Http\Controllers\Api\UserController@profile360` | `tests\Feature\ReportWorkingTimeTest.php` |
| Uncovered | `GET` | `/api/users/{id}/stats` | `App\Http\Controllers\Api\UserController@stats` | - |
| Uncovered | `GET` | `/api/users/{user}` | `App\Http\Controllers\Api\UserController@show` | - |
| Uncovered | `PUT|PATCH` | `/api/users/{user}` | `App\Http\Controllers\Api\UserController@update` | - |
| Uncovered | `DELETE` | `/api/users/{user}` | `App\Http\Controllers\Api\UserController@destroy` | - |
