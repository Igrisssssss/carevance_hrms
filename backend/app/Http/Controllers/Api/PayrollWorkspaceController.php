<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayRun;
use App\Models\PayrollAdjustment;
use App\Models\PayrollProfile;
use App\Models\PayrollSetting;
use App\Models\Reimbursement;
use App\Models\SalaryComponent;
use App\Models\SalaryTemplate;
use App\Models\SalaryTemplateComponent;
use App\Models\User;
use App\Services\Payroll\PayrollDomainService;
use App\Services\Payroll\PayrollWorkspaceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollWorkspaceController extends Controller
{
    public function __construct(
        private readonly PayrollDomainService $payrollDomainService,
        private readonly PayrollWorkspaceService $payrollWorkspaceService,
    ) {
    }

    public function overview(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(
            $this->payrollWorkspaceService->overview($user, $request->get('payroll_month', now()->format('Y-m')))
        );
    }

    public function payRuns(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'data' => $this->payrollWorkspaceService->runList($user, $request->get('payroll_month')),
        ]);
    }

    public function showPayRun(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $detail = $this->payrollWorkspaceService->runDetail($user, $id);
        if (!$detail) {
            return response()->json(['message' => 'Pay run not found'], 404);
        }

        return response()->json($detail);
    }

    public function updatePayRunStatus(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'status' => 'required|in:draft,processed,approved,finalized,locked,paid',
        ]);

        $run = PayRun::query()
            ->where('organization_id', $user->organization_id)
            ->find($id);

        if (!$run) {
            return response()->json(['message' => 'Pay run not found'], 404);
        }

        $run->status = $data['status'];
        if ($data['status'] === 'approved') {
            $run->approved_by = $user->id;
            $run->approved_at = now();
        }
        if ($data['status'] === 'finalized') {
            $run->finalized_at = now();
        }
        if ($data['status'] === 'locked') {
            $run->locked_at = now();
        }
        $run->save();

        $this->payrollWorkspaceService->logWorkspaceAudit((int) $user->organization_id, $user->id, 'pay_run.status_updated', $run, [
            'status' => $run->status,
        ]);

        return response()->json($run->fresh(['items.user', 'items.payroll.transactions']));
    }

    public function profiles(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'employees' => User::query()
                ->where('organization_id', $user->organization_id)
                ->where('role', 'employee')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role']),
            'templates' => SalaryTemplate::query()
                ->where('organization_id', $user->organization_id)
                ->with('components.component')
                ->orderBy('name')
                ->get(),
            'profiles' => PayrollProfile::query()
                ->where('organization_id', $user->organization_id)
                ->with(['user', 'salaryTemplate.components.component'])
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeProfile(Request $request)
    {
        return $this->saveProfile($request);
    }

    public function updateProfile(Request $request, int $id)
    {
        return $this->saveProfile($request, $id);
    }

    public function components(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'data' => SalaryComponent::query()
                ->where('organization_id', $user->organization_id)
                ->orderBy('category')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storeComponent(Request $request)
    {
        return $this->saveComponent($request);
    }

    public function updateComponent(Request $request, int $id)
    {
        return $this->saveComponent($request, $id);
    }

    public function deleteComponent(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $component = SalaryComponent::query()
            ->where('organization_id', $user->organization_id)
            ->find($id);

        if (!$component) {
            return response()->json(['message' => 'Salary component not found'], 404);
        }

        $component->delete();
        return response()->json(['message' => 'Salary component deleted.']);
    }

    public function templates(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'components' => SalaryComponent::query()
                ->where('organization_id', $user->organization_id)
                ->orderBy('category')
                ->orderBy('name')
                ->get(),
            'data' => SalaryTemplate::query()
                ->where('organization_id', $user->organization_id)
                ->with('components.component')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storeTemplate(Request $request)
    {
        return $this->saveTemplate($request);
    }

    public function updateTemplate(Request $request, int $id)
    {
        return $this->saveTemplate($request, $id);
    }

    public function deleteTemplate(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $template = SalaryTemplate::query()
            ->where('organization_id', $user->organization_id)
            ->find($id);

        if (!$template) {
            return response()->json(['message' => 'Salary template not found'], 404);
        }

        $template->delete();
        return response()->json(['message' => 'Salary template deleted.']);
    }

    public function adjustments(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'employees' => User::query()->where('organization_id', $user->organization_id)->where('role', 'employee')->orderBy('name')->get(['id', 'name', 'email', 'role']),
            'adjustments' => PayrollAdjustment::query()
                ->where('organization_id', $user->organization_id)
                ->with(['user', 'reimbursement', 'approvedBy'])
                ->when($request->filled('effective_month'), fn ($query) => $query->where('effective_month', $request->effective_month))
                ->latest()
                ->get(),
            'reimbursements' => Reimbursement::query()
                ->where('organization_id', $user->organization_id)
                ->with(['user', 'approvedBy'])
                ->latest()
                ->get(),
        ]);
    }

    public function storeAdjustment(Request $request)
    {
        return $this->saveAdjustment($request);
    }

    public function updateAdjustment(Request $request, int $id)
    {
        return $this->saveAdjustment($request, $id);
    }

    public function updateAdjustmentStatus(Request $request, int $id, string $status)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!in_array($status, ['approve', 'reject', 'apply'], true)) {
            return response()->json(['message' => 'Invalid adjustment action'], 422);
        }

        $adjustment = PayrollAdjustment::query()
            ->where('organization_id', $user->organization_id)
            ->find($id);

        if (!$adjustment) {
            return response()->json(['message' => 'Adjustment not found'], 404);
        }

        $adjustment->status = match ($status) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'apply' => 'applied',
        };
        if ($status === 'approve') {
            $adjustment->approved_by = $user->id;
            $adjustment->approved_at = now();
        }
        if ($status === 'apply') {
            $adjustment->applied_at = now();
        }
        $adjustment->approval_note = (string) $request->get('approval_note', $adjustment->approval_note);
        $adjustment->save();

        return response()->json($adjustment->fresh(['user', 'reimbursement', 'approvedBy']));
    }

    public function reports(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(
            $this->payrollWorkspaceService->reports($user, $request->get('payroll_month', now()->format('Y-m')))
        );
    }

    public function settings(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($this->payrollWorkspaceService->settingsForOrganization((int) $user->organization_id));
    }

    public function updateSettings(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $setting = $this->payrollWorkspaceService->settingsForOrganization((int) $user->organization_id);
        $data = $request->validate([
            'payroll_calendar' => 'nullable|array',
            'default_payout_method' => 'nullable|array',
            'overtime_rules' => 'nullable|array',
            'late_deduction_rules' => 'nullable|array',
            'leave_mapping' => 'nullable|array',
            'approval_workflow' => 'nullable|array',
            'payslip_branding' => 'nullable|array',
        ]);

        $setting->fill($data);
        $setting->save();

        $this->payrollWorkspaceService->logWorkspaceAudit((int) $user->organization_id, $user->id, 'payroll_settings.updated', $setting, $data);

        return response()->json($setting->fresh());
    }

    private function saveProfile(Request $request, ?int $id = null)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'user_id' => 'required|integer',
            'salary_template_id' => 'nullable|integer',
            'currency' => 'nullable|string|max:8',
            'payout_method' => 'nullable|string|max:32',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_ifsc_swift' => 'nullable|string|max:255',
            'payment_email' => 'nullable|email',
            'tax_identifier' => 'nullable|string|max:255',
            'payroll_eligible' => 'nullable|boolean',
            'reimbursements_eligible' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'earning_components' => 'nullable|array',
            'deduction_components' => 'nullable|array',
            'bonus_amount' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'meta' => 'nullable|array',
            'template_effective_from' => 'nullable|date',
        ]);

        $profile = PayrollProfile::query()
            ->where('organization_id', $user->organization_id)
            ->when($id, fn ($query) => $query->where('id', $id))
            ->first() ?: new PayrollProfile(['organization_id' => $user->organization_id]);

        $profile->fill($data);
        $profile->organization_id = $user->organization_id;
        $profile->save();

        if (!empty($data['salary_template_id'])) {
            $this->payrollWorkspaceService->applyTemplateAssignment(
                (int) $user->organization_id,
                (int) $data['user_id'],
                (int) $data['salary_template_id'],
                (string) ($data['template_effective_from'] ?? now()->toDateString())
            );
        }

        $this->payrollWorkspaceService->logWorkspaceAudit((int) $user->organization_id, $user->id, $id ? 'payroll_profile.updated' : 'payroll_profile.created', $profile, $data);

        return response()->json($profile->fresh(['user', 'salaryTemplate.components.component']), $id ? 200 : 201);
    }

    private function saveComponent(Request $request, ?int $id = null)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:80',
            'category' => 'required|in:basic,allowance,overtime,bonus,reimbursement,penalty,tax,deduction,other',
            'value_type' => 'required|in:fixed,percentage',
            'default_value' => 'nullable|numeric',
            'is_taxable' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'meta' => 'nullable|array',
        ]);

        $component = SalaryComponent::query()
            ->where('organization_id', $user->organization_id)
            ->when($id, fn ($query) => $query->where('id', $id))
            ->first() ?: new SalaryComponent(['organization_id' => $user->organization_id]);

        $component->fill($data);
        $component->organization_id = $user->organization_id;
        $component->save();

        return response()->json($component, $id ? 200 : 201);
    }

    private function saveTemplate(Request $request, ?int $id = null)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'currency' => 'nullable|string|max:8',
            'is_active' => 'nullable|boolean',
            'components' => 'nullable|array',
            'components.*.salary_component_id' => 'required|integer',
            'components.*.value_type' => 'required|in:fixed,percentage',
            'components.*.value' => 'nullable|numeric',
            'components.*.sort_order' => 'nullable|integer',
            'components.*.is_enabled' => 'nullable|boolean',
        ]);

        $template = SalaryTemplate::query()
            ->where('organization_id', $user->organization_id)
            ->when($id, fn ($query) => $query->where('id', $id))
            ->first() ?: new SalaryTemplate(['organization_id' => $user->organization_id]);

        DB::transaction(function () use ($template, $data, $user) {
            $template->fill(collect($data)->except('components')->all());
            $template->organization_id = $user->organization_id;
            $template->save();

            $template->components()->delete();
            foreach (($data['components'] ?? []) as $componentRow) {
                SalaryTemplateComponent::query()->create([
                    'salary_template_id' => $template->id,
                    'salary_component_id' => (int) $componentRow['salary_component_id'],
                    'value_type' => $componentRow['value_type'],
                    'value' => (float) ($componentRow['value'] ?? 0),
                    'sort_order' => (int) ($componentRow['sort_order'] ?? 0),
                    'is_enabled' => (bool) ($componentRow['is_enabled'] ?? true),
                ]);
            }
        });

        return response()->json($template->fresh('components.component'), $id ? 200 : 201);
    }

    private function saveAdjustment(Request $request, ?int $id = null)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$this->payrollDomainService->canManagePayroll($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'user_id' => 'required|integer',
            'payroll_profile_id' => 'nullable|integer',
            'reimbursement_id' => 'nullable|integer',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'kind' => 'required|in:reimbursement,bonus,manual_deduction,penalty,one_time_adjustment',
            'effective_month' => 'required|string|size:7',
            'amount' => 'required|numeric',
            'currency' => 'nullable|string|max:8',
            'status' => 'nullable|in:draft,pending_approval,approved,rejected,applied',
            'approval_note' => 'nullable|string',
            'meta' => 'nullable|array',
            'reimbursement' => 'nullable|array',
            'reimbursement.title' => 'nullable|string|max:255',
            'reimbursement.description' => 'nullable|string',
            'reimbursement.expense_date' => 'nullable|date',
            'reimbursement.amount' => 'nullable|numeric',
            'reimbursement.currency' => 'nullable|string|max:8',
            'reimbursement.status' => 'nullable|in:draft,pending_approval,approved,rejected,applied',
        ]);

        $adjustment = PayrollAdjustment::query()
            ->where('organization_id', $user->organization_id)
            ->when($id, fn ($query) => $query->where('id', $id))
            ->first() ?: new PayrollAdjustment(['organization_id' => $user->organization_id, 'created_by' => $user->id]);

        DB::transaction(function () use ($adjustment, $data, $user) {
            if (!empty($data['reimbursement'])) {
                $reimbursement = !empty($data['reimbursement_id'])
                    ? Reimbursement::query()
                        ->where('organization_id', $user->organization_id)
                        ->find((int) $data['reimbursement_id'])
                    : new Reimbursement(['organization_id' => $user->organization_id, 'submitted_by' => $user->id]);

                $reimbursement ??= new Reimbursement(['organization_id' => $user->organization_id, 'submitted_by' => $user->id]);
                $reimbursement->fill([
                    'user_id' => (int) $data['user_id'],
                    'title' => (string) ($data['reimbursement']['title'] ?? $data['title']),
                    'description' => $data['reimbursement']['description'] ?? null,
                    'expense_date' => $data['reimbursement']['expense_date'] ?? null,
                    'amount' => (float) ($data['reimbursement']['amount'] ?? $data['amount']),
                    'currency' => (string) ($data['reimbursement']['currency'] ?? $data['currency'] ?? config('payroll.default_currency', 'INR')),
                    'status' => (string) ($data['reimbursement']['status'] ?? 'draft'),
                    'submitted_by' => $user->id,
                ]);
                $reimbursement->organization_id = $user->organization_id;
                $reimbursement->save();
                $adjustment->reimbursement_id = $reimbursement->id;
            }

            $adjustment->fill(collect($data)->except('reimbursement')->all());
            $adjustment->organization_id = $user->organization_id;
            $adjustment->save();
        });

        return response()->json($adjustment->fresh(['user', 'reimbursement', 'approvedBy']), $id ? 200 : 201);
    }
}
