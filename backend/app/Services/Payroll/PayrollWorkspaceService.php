<?php

namespace App\Services\Payroll;

use App\Models\AttendanceRecord;
use App\Models\AttendanceTimeEditRequest;
use App\Models\EmployeeSalaryAssignment;
use App\Models\LeaveRequest;
use App\Models\PayRun;
use App\Models\PayRunItem;
use App\Models\Payroll;
use App\Models\PayrollAdjustment;
use App\Models\PayrollAuditLog;
use App\Models\PayrollProfile;
use App\Models\PayrollSetting;
use App\Models\Payslip;
use App\Models\ReportGroup;
use App\Models\Reimbursement;
use App\Models\SalaryTemplate;
use App\Models\SalaryTemplateComponent;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Collection;

class PayrollWorkspaceService
{
    public function __construct(
        private readonly PayrollDomainService $payrollDomainService,
    ) {
    }

    public function syncPayRunForMonth(int $organizationId, string $payrollMonth, ?int $actorUserId = null): ?PayRun
    {
        $records = Payroll::query()
            ->with(['user', 'transactions'])
            ->where('organization_id', $organizationId)
            ->where('payroll_month', $payrollMonth)
            ->orderBy('user_id')
            ->get();

        if ($records->isEmpty()) {
            return null;
        }

        $run = PayRun::query()->updateOrCreate(
            ['organization_id' => $organizationId, 'run_code' => $this->runCode($payrollMonth)],
            [
                'payroll_month' => $payrollMonth,
                'status' => $this->deriveRunStatus($records),
                'currency' => (string) config('payroll.default_currency', 'INR'),
                'generated_by' => $actorUserId,
                'generated_at' => now(),
            ]
        );

        foreach ($records as $record) {
            $profile = PayrollProfile::query()
                ->where('organization_id', $organizationId)
                ->where('user_id', $record->user_id)
                ->first();
            $attendance = $this->attendanceSummary($organizationId, (int) $record->user_id, $payrollMonth);
            $warnings = $this->employeeWarnings($record->user, $profile, $attendance);

            PayRunItem::query()->updateOrCreate(
                ['pay_run_id' => $run->id, 'user_id' => $record->user_id],
                [
                    'organization_id' => $organizationId,
                    'payroll_id' => $record->id,
                    'payroll_profile_id' => $profile?->id,
                    'payable_days' => (float) $attendance['payable_days'],
                    'worked_seconds' => (int) $attendance['worked_seconds'],
                    'overtime_seconds' => (int) $attendance['overtime_seconds'],
                    'approved_leave_days' => (int) $attendance['approved_leave_days'],
                    'approved_time_edit_seconds' => (int) $attendance['approved_time_edit_seconds'],
                    'gross_pay' => round((float) $record->basic_salary + (float) $record->allowances + (float) $record->bonus, 2),
                    'total_deductions' => round((float) $record->deductions + (float) $record->tax, 2),
                    'net_pay' => (float) $record->net_salary,
                    'status' => (string) $record->payroll_status,
                    'payout_status' => (string) $record->payout_status,
                    'salary_breakdown' => [
                        'basic_salary' => (float) $record->basic_salary,
                        'allowances' => (float) $record->allowances,
                        'bonus' => (float) $record->bonus,
                        'deductions' => (float) $record->deductions,
                        'tax' => (float) $record->tax,
                    ],
                    'attendance_summary' => $attendance,
                    'warnings' => $warnings,
                ]
            );
        }

        $items = $run->items()->get();
        $run->summary = [
            'gross_payroll' => round($items->sum('gross_pay'), 2),
            'net_payroll' => round($items->sum('net_pay'), 2),
            'employees_count' => $items->count(),
            'paid_count' => $items->where('status', 'paid')->count(),
            'failed_payouts' => $items->where('payout_status', 'failed')->count(),
            'pending_payouts' => $items->where('payout_status', 'pending')->count(),
            'overtime_seconds' => (int) $items->sum('overtime_seconds'),
        ];
        $run->warnings = $items
            ->filter(fn (PayRunItem $item) => !empty($item->warnings))
            ->map(fn (PayRunItem $item) => ['user_id' => $item->user_id, 'warnings' => $item->warnings])
            ->values()
            ->all();
        $run->status = $this->deriveRunStatus($records);
        $run->save();

        return $run->fresh(['items.user', 'items.payroll.transactions', 'generatedBy', 'approvedBy']);
    }

    public function overview(User $user, string $payrollMonth): array
    {
        $run = $this->syncPayRunForMonth((int) $user->organization_id, $payrollMonth, $user->id);
        $records = Payroll::query()
            ->with('user')
            ->where('organization_id', $user->organization_id)
            ->where('payroll_month', $payrollMonth)
            ->get();

        $pendingActions = [
            'leave_requests' => LeaveRequest::query()->where('organization_id', $user->organization_id)->where('status', 'pending')->count(),
            'attendance_time_edits' => AttendanceTimeEditRequest::query()->where('organization_id', $user->organization_id)->where('status', 'pending')->count(),
            'payroll_adjustments' => PayrollAdjustment::query()->where('organization_id', $user->organization_id)->where('status', 'pending_approval')->count(),
        ];

        return [
            'month' => $payrollMonth,
            'summary' => [
                'gross_payroll' => round($records->sum(fn (Payroll $row) => (float) $row->basic_salary + (float) $row->allowances + (float) $row->bonus), 2),
                'net_payroll' => round($records->sum('net_salary'), 2),
                'employees_in_current_run' => $records->count(),
                'pending_approvals' => array_sum($pendingActions),
                'paid_count' => $records->where('payroll_status', 'paid')->count(),
                'failed_or_pending_payouts' => $records->filter(fn (Payroll $row) => $row->payout_status !== 'success')->count(),
                'total_overtime_value' => 0,
                'reimbursements_pending' => Reimbursement::query()->where('organization_id', $user->organization_id)->whereIn('status', ['draft', 'pending_approval'])->count(),
            ],
            'current_pay_run' => $run,
            'missing_profiles' => $this->workspaceWarnings((int) $user->organization_id, $payrollMonth),
            'recent_transactions' => $this->recentTransactions((int) $user->organization_id, $payrollMonth),
            'pending_actions' => $pendingActions,
            'status_distribution' => [
                'draft' => $records->where('payroll_status', 'draft')->count(),
                'processed' => $records->where('payroll_status', 'processed')->count(),
                'paid' => $records->where('payroll_status', 'paid')->count(),
                'payout_pending' => $records->where('payout_status', 'pending')->count(),
                'payout_failed' => $records->where('payout_status', 'failed')->count(),
                'payout_success' => $records->where('payout_status', 'success')->count(),
            ],
            'quick_links' => [
                'profiles' => PayrollProfile::query()->where('organization_id', $user->organization_id)->count(),
                'templates' => SalaryTemplate::query()->where('organization_id', $user->organization_id)->count(),
                'adjustments' => PayrollAdjustment::query()->where('organization_id', $user->organization_id)->count(),
                'payslips' => Payslip::query()->where('organization_id', $user->organization_id)->where('period_month', $payrollMonth)->count(),
            ],
            'readiness_warnings' => $this->workspaceWarnings((int) $user->organization_id, $payrollMonth),
        ];
    }

    public function runList(User $user, ?string $payrollMonth = null): array
    {
        if ($payrollMonth) {
            $this->syncPayRunForMonth((int) $user->organization_id, $payrollMonth, $user->id);
        }

        return PayRun::query()
            ->withCount('items')
            ->where('organization_id', $user->organization_id)
            ->when($payrollMonth, fn ($query) => $query->where('payroll_month', $payrollMonth))
            ->latest('payroll_month')
            ->latest('id')
            ->get()
            ->map(function (PayRun $run) {
                $summary = $run->summary ?: [];
                return [
                    'id' => $run->id,
                    'run_code' => $run->run_code,
                    'payroll_month' => $run->payroll_month,
                    'status' => $run->status,
                    'currency' => $run->currency,
                    'items_count' => $run->items_count,
                    'gross_payroll' => (float) ($summary['gross_payroll'] ?? 0),
                    'net_payroll' => (float) ($summary['net_payroll'] ?? 0),
                    'paid_count' => (int) ($summary['paid_count'] ?? 0),
                    'failed_payouts' => (int) ($summary['failed_payouts'] ?? 0),
                    'warnings_count' => count($run->warnings ?: []),
                    'generated_at' => optional($run->generated_at)->toIso8601String(),
                    'locked_at' => optional($run->locked_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    public function runDetail(User $user, int $runId): ?array
    {
        $run = PayRun::query()
            ->with(['items.user', 'items.payroll.transactions', 'items.payrollProfile.salaryTemplate.components.component', 'generatedBy', 'approvedBy'])
            ->where('organization_id', $user->organization_id)
            ->find($runId);

        if (!$run) {
            return null;
        }

        return [
            'run' => $run,
            'summary' => $run->summary ?: [],
            'warnings' => $run->warnings ?: [],
        ];
    }

    public function attendanceSummary(int $organizationId, int $userId, string $payrollMonth): array
    {
        [$start, $end] = $this->monthWindow($payrollMonth);
        $shiftTarget = max(1, (int) env('ATTENDANCE_SHIFT_SECONDS', 8 * 3600));

        $records = AttendanceRecord::query()
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
            ->get();

        $approvedLeaves = LeaveRequest::query()
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->get(['start_date', 'end_date']);

        $approvedLeaveDays = $approvedLeaves
            ->flatMap(fn ($leave) => collect(CarbonPeriod::create($leave->start_date, $leave->end_date))
                ->filter(fn (Carbon $date) => $date->betweenIncluded($start, $end))
                ->map(fn (Carbon $date) => $date->toDateString()))
            ->unique()
            ->count();

        $approvedTimeEditSeconds = (int) AttendanceTimeEditRequest::query()
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
            ->sum('extra_seconds');

        $workedSeconds = (int) $records->sum(fn (AttendanceRecord $record) => (int) ($record->worked_seconds ?? 0) + (int) ($record->manual_adjustment_seconds ?? 0));
        if ($workedSeconds <= 0) {
            $workedSeconds = (int) TimeEntry::query()
                ->where('user_id', $userId)
                ->whereBetween('start_time', [$start->toDateTimeString(), $end->copy()->endOfDay()->toDateTimeString()])
                ->sum('duration');
        }

        return [
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'present_days' => $records->filter(fn (AttendanceRecord $record) => !empty($record->check_in_at))->count(),
            'approved_leave_days' => $approvedLeaveDays,
            'approved_time_edit_seconds' => $approvedTimeEditSeconds,
            'payable_days' => round($records->filter(fn (AttendanceRecord $record) => !empty($record->check_in_at))->count() + $approvedLeaveDays, 2),
            'worked_seconds' => $workedSeconds,
            'overtime_seconds' => (int) $records->sum(fn (AttendanceRecord $record) => max(0, ((int) ($record->worked_seconds ?? 0) + (int) ($record->manual_adjustment_seconds ?? 0)) - $shiftTarget)),
            'attendance_records_count' => $records->count(),
            'has_attendance_summary' => $records->isNotEmpty() || $workedSeconds > 0,
        ];
    }

    public function workspaceWarnings(int $organizationId, string $payrollMonth): array
    {
        return User::query()
            ->where('organization_id', $organizationId)
            ->where('role', 'employee')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'organization_id'])
            ->map(function (User $employee) use ($organizationId, $payrollMonth) {
                $profile = PayrollProfile::query()
                    ->where('organization_id', $organizationId)
                    ->where('user_id', $employee->id)
                    ->first();
                $attendance = $this->attendanceSummary($organizationId, (int) $employee->id, $payrollMonth);

                return [
                    'user_id' => $employee->id,
                    'name' => $employee->name,
                    'email' => $employee->email,
                    'warnings' => $this->employeeWarnings($employee, $profile, $attendance),
                ];
            })
            ->filter(fn (array $item) => count($item['warnings']) > 0)
            ->values()
            ->all();
    }

    public function employeeWarningsForUser(int $organizationId, User $employee, string $payrollMonth): array
    {
        $profile = PayrollProfile::query()
            ->where('organization_id', $organizationId)
            ->where('user_id', $employee->id)
            ->first();
        $attendance = $this->attendanceSummary($organizationId, (int) $employee->id, $payrollMonth);

        return $this->employeeWarnings($employee, $profile, $attendance);
    }

    public function reports(User $user, string $payrollMonth): array
    {
        $run = $this->syncPayRunForMonth((int) $user->organization_id, $payrollMonth, $user->id);
        $items = $run?->items()->with('user')->get() ?? collect();

        return [
            'monthly_summary' => $run?->summary ?: [],
            'employee_payroll_sheet' => $items->map(fn (PayRunItem $item) => [
                'id' => $item->id,
                'user' => $item->user?->only(['id', 'name', 'email']),
                'payable_days' => (float) $item->payable_days,
                'worked_seconds' => (int) $item->worked_seconds,
                'overtime_seconds' => (int) $item->overtime_seconds,
                'gross_pay' => (float) $item->gross_pay,
                'total_deductions' => (float) $item->total_deductions,
                'net_pay' => (float) $item->net_pay,
                'status' => $item->status,
                'payout_status' => $item->payout_status,
            ])->values(),
            'department_payroll_cost' => ReportGroup::query()
                ->with('users:id,name')
                ->where('organization_id', $user->organization_id)
                ->get()
                ->map(function (ReportGroup $group) use ($items) {
                    $groupItems = $items->whereIn('user_id', $group->users->pluck('id')->all());
                    return [
                        'id' => $group->id,
                        'name' => $group->name,
                        'employee_count' => $groupItems->count(),
                        'gross_pay' => round($groupItems->sum('gross_pay'), 2),
                        'net_pay' => round($groupItems->sum('net_pay'), 2),
                    ];
                })
                ->values(),
            'deductions_report' => $items->map(fn (PayRunItem $item) => [
                'id' => $item->id,
                'user' => $item->user?->only(['id', 'name', 'email']),
                'deductions' => (float) ($item->salary_breakdown['deductions'] ?? 0),
                'tax' => (float) ($item->salary_breakdown['tax'] ?? 0),
                'total_deductions' => (float) $item->total_deductions,
            ])->values(),
            'payout_status_report' => $items->groupBy('payout_status')->map(fn (Collection $group, string $status) => [
                'status' => $status,
                'count' => $group->count(),
                'amount' => round($group->sum('net_pay'), 2),
            ])->values(),
            'attendance_vs_payable_days' => $items->map(fn (PayRunItem $item) => [
                'id' => $item->id,
                'user' => $item->user?->only(['id', 'name', 'email']),
                'payable_days' => (float) $item->payable_days,
                'attendance_present_days' => (int) ($item->attendance_summary['present_days'] ?? 0),
                'approved_leave_days' => (int) ($item->attendance_summary['approved_leave_days'] ?? 0),
                'worked_seconds' => (int) $item->worked_seconds,
            ])->values(),
            'overtime_summary' => $items->map(fn (PayRunItem $item) => [
                'id' => $item->id,
                'user' => $item->user?->only(['id', 'name', 'email']),
                'overtime_seconds' => (int) $item->overtime_seconds,
            ])->values(),
        ];
    }

    public function settingsForOrganization(int $organizationId): PayrollSetting
    {
        return PayrollSetting::query()->firstOrCreate(
            ['organization_id' => $organizationId],
            [
                'payroll_calendar' => ['cutoff_day' => 30, 'payment_day' => 1],
                'default_payout_method' => ['method' => 'mock', 'currency' => (string) config('payroll.default_currency', 'INR')],
                'overtime_rules' => ['enabled' => true, 'rate_multiplier' => 1.5],
                'late_deduction_rules' => ['enabled' => false, 'deduction_per_late_day' => 0],
                'leave_mapping' => ['approved_leave_counts_as_payable_day' => true],
                'approval_workflow' => ['adjustments_require_approval' => true, 'pay_run_requires_finalization' => true],
                'payslip_branding' => ['company_name' => 'CareVance', 'accent_color' => '#0f172a'],
            ]
        );
    }

    public function applyTemplateAssignment(int $organizationId, int $userId, int $salaryTemplateId, string $effectiveFrom): EmployeeSalaryAssignment
    {
        EmployeeSalaryAssignment::query()
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->update([
                'is_active' => false,
                'effective_to' => Carbon::parse($effectiveFrom)->copy()->subDay()->toDateString(),
            ]);

        return EmployeeSalaryAssignment::query()->create([
            'organization_id' => $organizationId,
            'user_id' => $userId,
            'salary_template_id' => $salaryTemplateId,
            'effective_from' => $effectiveFrom,
            'effective_to' => null,
            'is_active' => true,
        ]);
    }

    public function resolveSalarySource(int $organizationId, int $userId, string $payrollMonth): array
    {
        $periodStart = $this->periodStart($payrollMonth);
        $assignment = EmployeeSalaryAssignment::query()
            ->with('salaryTemplate.components.component')
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $periodStart->toDateString())
            ->where(function ($query) use ($periodStart) {
                $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $periodStart->toDateString());
            })
            ->latest('effective_from')
            ->first();

        if ($assignment?->salaryTemplate) {
            return ['source' => 'salary_template', 'template_id' => $assignment->salaryTemplate->id];
        }

        $structure = $this->payrollDomainService->resolvePayrollStructure($organizationId, $userId, $periodStart, null);
        return ['source' => $structure ? 'legacy_structure' : 'none', 'structure_id' => $structure?->id];
    }

    public function compensationSnapshot(int $organizationId, int $userId, string $payrollMonth): array
    {
        $periodStart = $this->periodStart($payrollMonth);
        $assignment = EmployeeSalaryAssignment::query()
            ->with('salaryTemplate.components.component')
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $periodStart->toDateString())
            ->where(function ($query) use ($periodStart) {
                $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $periodStart->toDateString());
            })
            ->latest('effective_from')
            ->first();

        if ($assignment?->salaryTemplate) {
            return [
                'source' => 'salary_template',
                'snapshot' => $this->salaryTemplateSnapshot($assignment->salaryTemplate),
            ];
        }

        $structure = $this->payrollDomainService->resolvePayrollStructure($organizationId, $userId, $periodStart, null);
        if ($structure) {
            [, $allowanceTotal] = $this->payrollDomainService->computeComponents($structure->allowances->toArray(), (float) $structure->basic_salary);
            [, $deductionTotal] = $this->payrollDomainService->computeComponents($structure->deductions->toArray(), (float) $structure->basic_salary);

            return [
                'source' => 'legacy_structure',
                'structure' => $structure,
                'snapshot' => [
                    'basic_salary' => round((float) $structure->basic_salary, 2),
                    'allowances' => round((float) $allowanceTotal, 2),
                    'deductions' => round((float) $deductionTotal, 2),
                    'bonus' => 0.0,
                    'tax' => 0.0,
                    'earnings_components' => [],
                    'deduction_components' => [],
                ],
            ];
        }

        return [
            'source' => 'none',
            'snapshot' => [
                'basic_salary' => 0.0,
                'allowances' => 0.0,
                'deductions' => 0.0,
                'bonus' => 0.0,
                'tax' => 0.0,
                'earnings_components' => [],
                'deduction_components' => [],
            ],
        ];
    }

    public function logWorkspaceAudit(int $organizationId, ?int $userId, string $action, mixed $target = null, ?array $payload = null): void
    {
        PayrollAuditLog::query()->create([
            'organization_id' => $organizationId,
            'user_id' => $userId,
            'action' => $action,
            'target_type' => is_object($target) ? class_basename($target) : (is_string($target) ? $target : null),
            'target_id' => is_object($target) && property_exists($target, 'id') ? $target->id : null,
            'payload' => $payload,
        ]);
    }

    private function monthWindow(string $payrollMonth): array
    {
        $start = $this->periodStart($payrollMonth);
        return [$start, $start->copy()->endOfMonth()];
    }

    private function periodStart(string $payrollMonth): Carbon
    {
        $normalized = preg_match('/^\d{4}-\d{2}$/', $payrollMonth) ? sprintf('%s-01', $payrollMonth) : $payrollMonth;

        return Carbon::parse($normalized)->startOfMonth();
    }

    private function runCode(string $payrollMonth): string
    {
        return 'RUN-'.str_replace('-', '', $payrollMonth);
    }

    private function deriveRunStatus(Collection $records): string
    {
        if ($records->every(fn (Payroll $record) => $record->payroll_status === 'paid')) {
            return 'paid';
        }

        if ($records->every(fn (Payroll $record) => in_array($record->payroll_status, ['processed', 'paid'], true))) {
            return 'processed';
        }

        return 'draft';
    }

    private function recentTransactions(int $organizationId, string $payrollMonth): array
    {
        return \App\Models\PayrollTransaction::query()
            ->with('payroll.user')
            ->whereHas('payroll', function ($query) use ($organizationId, $payrollMonth) {
                $query->where('organization_id', $organizationId)
                    ->where('payroll_month', $payrollMonth);
            })
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn ($transaction) => [
                'id' => $transaction->id,
                'provider' => $transaction->provider,
                'status' => $transaction->status,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
                'created_at' => optional($transaction->created_at)->toIso8601String(),
                'employee' => $transaction->payroll?->user?->only(['id', 'name', 'email']),
            ])
            ->values()
            ->all();
    }

    private function employeeWarnings(?User $employee, ?PayrollProfile $profile, array $attendance): array
    {
        $warnings = [];
        $salarySource = $employee ? $this->resolveSalarySource((int) $employee->organization_id, (int) $employee->id, Carbon::parse($attendance['period_start'])->format('Y-m')) : ['source' => 'none'];

        if (!$profile) {
            $warnings[] = 'Missing payroll profile';
        }
        if ($profile && empty($profile->payout_method)) {
            $warnings[] = 'Missing payout method';
        }
        if ($profile && in_array((string) $profile->payout_method, ['bank_transfer', 'stripe'], true) && empty($profile->bank_account_number) && empty($profile->payment_email)) {
            $warnings[] = 'Missing bank or payment destination details';
        }
        if (!($attendance['has_attendance_summary'] ?? false)) {
            $warnings[] = 'Missing attendance summary';
        }
        if (($salarySource['source'] ?? 'none') === 'none') {
            $warnings[] = 'Missing salary structure or template';
        }

        return array_values(array_unique($warnings));
    }

    private function salaryTemplateSnapshot(SalaryTemplate $template): array
    {
        $template->loadMissing('components.component');

        $basicComponent = $template->components->first(fn (SalaryTemplateComponent $item) => $item->component?->category === 'basic');
        $basicSalary = (float) ($basicComponent?->value ?? $basicComponent?->component?->default_value ?? 0);
        $allowances = 0.0;
        $deductions = 0.0;
        $bonus = 0.0;
        $tax = 0.0;
        $earnings = [];
        $deductionRows = [];

        foreach ($template->components as $item) {
          if (!$item->is_enabled || !$item->component) {
              continue;
          }

          $category = (string) $item->component->category;
          if ($category === 'basic') {
              continue;
          }

          $computed = $item->value_type === 'percentage'
              ? round(($basicSalary * (float) $item->value) / 100, 2)
              : round((float) $item->value, 2);

          $row = [
              'salary_component_id' => $item->salary_component_id,
              'name' => $item->component->name,
              'category' => $category,
              'value_type' => $item->value_type,
              'value' => (float) $item->value,
              'computed_amount' => $computed,
          ];

          if (in_array($category, ['allowance', 'reimbursement', 'other'], true)) {
              $allowances += $computed;
              $earnings[] = $row;
              continue;

          }

          
          if ($category === 'earning'){
                $allowances += $computed;
                $earnings[] = $row;
                continue;

          }
          if ($category === 'bonus') {
              $bonus += $computed;
              $earnings[] = $row;
              continue;
          }
          if ($category === 'tax') {
              $tax += $computed;
          } else {
              $deductions += $computed;
          }
          $deductionRows[] = $row;
        }

        return [
            'basic_salary' => round($basicSalary, 2),
            'allowances' => round($allowances, 2),
            'deductions' => round($deductions, 2),
            'bonus' => round($bonus, 2),
            'tax' => round($tax, 2),
            'earnings_components' => $earnings,
            'deduction_components' => $deductionRows,
        ];
    }
}
