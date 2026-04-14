<?php

use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PayrollWorkspaceController;
use Illuminate\Support\Facades\Route;

Route::middleware('role:admin,manager')->group(function () {
Route::get('/payroll/workspace/overview', [PayrollWorkspaceController::class, 'overview']);
Route::get('/payroll/workspace/runs', [PayrollWorkspaceController::class, 'payRuns']);
Route::get('/payroll/workspace/runs/{id}', [PayrollWorkspaceController::class, 'showPayRun']);
Route::post('/payroll/workspace/runs/{id}/status', [PayrollWorkspaceController::class, 'updatePayRunStatus']);
Route::get('/payroll/workspace/profiles', [PayrollWorkspaceController::class, 'profiles']);
Route::post('/payroll/workspace/profiles', [PayrollWorkspaceController::class, 'storeProfile']);
Route::put('/payroll/workspace/profiles/{id}', [PayrollWorkspaceController::class, 'updateProfile']);
Route::get('/payroll/workspace/components', [PayrollWorkspaceController::class, 'components']);
Route::post('/payroll/workspace/components', [PayrollWorkspaceController::class, 'storeComponent']);
Route::put('/payroll/workspace/components/{id}', [PayrollWorkspaceController::class, 'updateComponent']);
Route::delete('/payroll/workspace/components/{id}', [PayrollWorkspaceController::class, 'deleteComponent']);
Route::get('/payroll/workspace/templates', [PayrollWorkspaceController::class, 'templates']);
Route::post('/payroll/workspace/templates', [PayrollWorkspaceController::class, 'storeTemplate']);
Route::put('/payroll/workspace/templates/{id}', [PayrollWorkspaceController::class, 'updateTemplate']);
Route::delete('/payroll/workspace/templates/{id}', [PayrollWorkspaceController::class, 'deleteTemplate']);
Route::get('/payroll/workspace/adjustments', [PayrollWorkspaceController::class, 'adjustments']);
Route::post('/payroll/workspace/adjustments', [PayrollWorkspaceController::class, 'storeAdjustment']);
Route::put('/payroll/workspace/adjustments/{id}', [PayrollWorkspaceController::class, 'updateAdjustment']);
Route::post('/payroll/workspace/adjustments/{id}/approve', [PayrollWorkspaceController::class, 'updateAdjustmentStatus'])->defaults('status', 'approve');
Route::post('/payroll/workspace/adjustments/{id}/reject', [PayrollWorkspaceController::class, 'updateAdjustmentStatus'])->defaults('status', 'reject');
Route::post('/payroll/workspace/adjustments/{id}/apply', [PayrollWorkspaceController::class, 'updateAdjustmentStatus'])->defaults('status', 'apply');
Route::get('/payroll/workspace/reports', [PayrollWorkspaceController::class, 'reports']);
Route::get('/payroll/workspace/settings', [PayrollWorkspaceController::class, 'settings']);
Route::put('/payroll/workspace/settings', [PayrollWorkspaceController::class, 'updateSettings']);
Route::get('/payroll/workspace/tax-declarations', [PayrollWorkspaceController::class, 'taxDeclarations']);
Route::post('/payroll/workspace/tax-declarations', [PayrollWorkspaceController::class, 'storeTaxDeclaration']);
Route::put('/payroll/workspace/tax-declarations/{id}', [PayrollWorkspaceController::class, 'updateTaxDeclaration']);
Route::post('/payroll/workspace/tax-declarations/{id}/approve', [PayrollWorkspaceController::class, 'reviewTaxDeclaration'])->defaults('status', 'approve');
Route::post('/payroll/workspace/tax-declarations/{id}/reject', [PayrollWorkspaceController::class, 'reviewTaxDeclaration'])->defaults('status', 'reject');
Route::get('/payroll/structures', [PayrollController::class, 'structures']);
Route::post('/payroll/structures', [PayrollController::class, 'upsertStructure']);
Route::put('/payroll/structures/{id}', [PayrollController::class, 'updateStructure']);
Route::delete('/payroll/structures/{id}', [PayrollController::class, 'deleteStructure']);
Route::get('/payroll/employees', [PayrollController::class, 'employees']);
Route::get('/payroll/records', [PayrollController::class, 'records']);
Route::post('/payroll/records/generate', [PayrollController::class, 'generateRecords']);
Route::get('/payroll/records/{id}', [PayrollController::class, 'showRecord']);
Route::patch('/payroll/records/{id}', [PayrollController::class, 'updateRecord']);
Route::post('/payroll/records/{id}/status', [PayrollController::class, 'updateRecordStatus']);
Route::post('/payroll/records/{id}/payout', [PayrollController::class, 'payoutRecord']);
Route::post('/payroll/records/{id}/sync-stripe-checkout', [PayrollController::class, 'syncStripeCheckout']);
Route::get('/payroll/records/{id}/transactions', [PayrollController::class, 'recordTransactions']);
Route::post('/payroll/payslips/generate', [PayrollController::class, 'generatePayslip']);
Route::post('/payroll/payslips/pay-now', [PayrollController::class, 'payNow']);
});

Route::get('/payroll/payslips', [PayrollController::class, 'payslips']);
Route::get('/payroll/payslips/{id}', [PayrollController::class, 'showPayslip']);
Route::get('/payroll/payslips/{id}/pdf', [PayrollController::class, 'downloadPayslipPdf']);
