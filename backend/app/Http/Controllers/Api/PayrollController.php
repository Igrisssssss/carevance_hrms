<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollAllowance;
use App\Models\PayrollDeduction;
use App\Models\PayrollStructure;
use App\Models\Payslip;
use App\Models\User;
use App\Services\AppNotificationService;
use Carbon\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;

class PayrollController extends Controller
{
    public function __construct(private readonly AppNotificationService $notificationService)
    {
    }

    public function structures(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['users' => [], 'structures' => []]);
        }

        $users = User::where('organization_id', $currentUser->organization_id)
            ->when(!$this->canManagePayroll($currentUser), fn ($q) => $q->where('id', $currentUser->id))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        $structureQuery = PayrollStructure::with(['allowances', 'deductions', 'user'])
            ->where('organization_id', $currentUser->organization_id)
            ->whereIn('user_id', $users->pluck('id'))
            ->where('is_active', true)
            ->orderByDesc('effective_from');

        if ($request->filled('user_id')) {
            $structureQuery->where('user_id', (int) $request->user_id);
        }

        return response()->json([
            'users' => $users,
            'structures' => $structureQuery->get(),
        ]);
    }

    public function upsertStructure(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
            'basic_salary' => 'required|numeric|min:0',
            'currency' => 'nullable|in:INR,USD',
            'effective_from' => 'required|date',
            'allowances' => 'nullable|array',
            'allowances.*.name' => 'required_with:allowances|string|max:100',
            'allowances.*.calculation_type' => 'required_with:allowances|in:fixed,percentage',
            'allowances.*.amount' => 'required_with:allowances|numeric|min:0',
            'deductions' => 'nullable|array',
            'deductions.*.name' => 'required_with:deductions|string|max:100',
            'deductions.*.calculation_type' => 'required_with:deductions|in:fixed,percentage',
            'deductions.*.amount' => 'required_with:deductions|numeric|min:0',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        if (!$this->canManagePayroll($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $targetUser = User::where('organization_id', $currentUser->organization_id)
            ->where('id', (int) $request->user_id)
            ->first();

        if (!$targetUser) {
            return response()->json(['message' => 'User not found in your organization'], 404);
        }

        $structure = DB::transaction(function () use ($request, $currentUser, $targetUser) {
            PayrollStructure::where('organization_id', $currentUser->organization_id)
                ->where('user_id', $targetUser->id)
                ->where('is_active', true)
                ->update([
                    'is_active' => false,
                    'effective_to' => Carbon::parse($request->effective_from)->copy()->subDay()->toDateString(),
                    'updated_at' => now(),
                ]);

            $structure = PayrollStructure::create([
                'organization_id' => $currentUser->organization_id,
                'user_id' => $targetUser->id,
                'basic_salary' => (float) $request->basic_salary,
                'currency' => strtoupper((string) ($request->currency ?: 'INR')),
                'effective_from' => $request->effective_from,
                'effective_to' => null,
                'is_active' => true,
            ]);

            foreach (($request->allowances ?? []) as $item) {
                PayrollAllowance::create([
                    'payroll_structure_id' => $structure->id,
                    'name' => $item['name'],
                    'calculation_type' => $item['calculation_type'],
                    'amount' => (float) $item['amount'],
                ]);
            }

            foreach (($request->deductions ?? []) as $item) {
                PayrollDeduction::create([
                    'payroll_structure_id' => $structure->id,
                    'name' => $item['name'],
                    'calculation_type' => $item['calculation_type'],
                    'amount' => (float) $item['amount'],
                ]);
            }

            return $structure;
        });

        return response()->json($structure->load(['allowances', 'deductions', 'user']), 201);
    }

    public function updateStructure(Request $request, int $id)
    {
        $request->validate([
            'basic_salary' => 'required|numeric|min:0',
            'currency' => 'nullable|in:INR,USD',
            'effective_from' => 'required|date',
            'allowances' => 'nullable|array',
            'allowances.*.name' => 'required_with:allowances|string|max:100',
            'allowances.*.calculation_type' => 'required_with:allowances|in:fixed,percentage',
            'allowances.*.amount' => 'required_with:allowances|numeric|min:0',
            'deductions' => 'nullable|array',
            'deductions.*.name' => 'required_with:deductions|string|max:100',
            'deductions.*.calculation_type' => 'required_with:deductions|in:fixed,percentage',
            'deductions.*.amount' => 'required_with:deductions|numeric|min:0',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }
        if (!$this->canManagePayroll($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $structure = PayrollStructure::where('organization_id', $currentUser->organization_id)->find($id);
        if (!$structure) {
            return response()->json(['message' => 'Payroll structure not found'], 404);
        }

        DB::transaction(function () use ($request, $structure) {
            $structure->update([
                'basic_salary' => (float) $request->basic_salary,
                'currency' => strtoupper((string) ($request->currency ?: 'INR')),
                'effective_from' => $request->effective_from,
            ]);

            $structure->allowances()->delete();
            foreach (($request->allowances ?? []) as $item) {
                PayrollAllowance::create([
                    'payroll_structure_id' => $structure->id,
                    'name' => $item['name'],
                    'calculation_type' => $item['calculation_type'],
                    'amount' => (float) $item['amount'],
                ]);
            }

            $structure->deductions()->delete();
            foreach (($request->deductions ?? []) as $item) {
                PayrollDeduction::create([
                    'payroll_structure_id' => $structure->id,
                    'name' => $item['name'],
                    'calculation_type' => $item['calculation_type'],
                    'amount' => (float) $item['amount'],
                ]);
            }
        });

        return response()->json($structure->fresh()->load(['allowances', 'deductions', 'user']));
    }

    public function deleteStructure(Request $request, int $id)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }
        if (!$this->canManagePayroll($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $structure = PayrollStructure::where('organization_id', $currentUser->organization_id)->find($id);
        if (!$structure) {
            return response()->json(['message' => 'Payroll structure not found'], 404);
        }

        $structure->delete();

        return response()->json(['message' => 'Payroll structure deleted.']);
    }

    public function payslips(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|integer',
            'period_month' => ['nullable', 'regex:/^\d{4}\-\d{2}$/'],
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['data' => []]);
        }

        $query = Payslip::with(['user', 'generatedBy', 'payrollStructure'])
            ->where('organization_id', $currentUser->organization_id)
            ->orderByDesc('period_month')
            ->orderByDesc('generated_at');

        if ($request->filled('period_month')) {
            $query->where('period_month', $request->period_month);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->user_id);
        } elseif (!$this->canManagePayroll($currentUser)) {
            $query->where('user_id', $currentUser->id);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function generatePayslip(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
            'period_month' => ['required', 'regex:/^\d{4}\-\d{2}$/'],
            'payroll_structure_id' => 'nullable|integer',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        if (!$this->canManagePayroll($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $targetUser = User::where('organization_id', $currentUser->organization_id)
            ->where('id', (int) $request->user_id)
            ->first();
        if (!$targetUser) {
            return response()->json(['message' => 'User not found in your organization'], 404);
        }

        $periodStart = Carbon::createFromFormat('Y-m', $request->period_month)->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();

        $structure = $this->resolvePayrollStructure(
            $currentUser->organization_id,
            $targetUser->id,
            $periodStart,
            $request->get('payroll_structure_id')
        );
        if (!$structure) {
            return response()->json(['message' => 'No payroll structure found for selected period'], 422);
        }

        $basicSalary = (float) $structure->basic_salary;
        [$allowances, $allowanceTotal] = $this->computeComponents($structure->allowances->toArray(), $basicSalary);
        [$deductions, $deductionTotal] = $this->computeComponents($structure->deductions->toArray(), $basicSalary);
        $net = max(0, $basicSalary + $allowanceTotal - $deductionTotal);

        $payslip = Payslip::updateOrCreate(
            [
                'organization_id' => $currentUser->organization_id,
                'user_id' => $targetUser->id,
                'period_month' => $request->period_month,
            ],
            [
                'payroll_structure_id' => $structure->id,
                'currency' => $structure->currency ?: 'INR',
                'basic_salary' => round($basicSalary, 2),
                'total_allowances' => round($allowanceTotal, 2),
                'total_deductions' => round($deductionTotal, 2),
                'net_salary' => round($net, 2),
                'allowances' => $allowances,
                'deductions' => $deductions,
                'generated_by' => $currentUser->id,
                'generated_at' => now(),
                'payment_status' => 'pending',
                'paid_at' => null,
                'paid_by' => null,
            ]
        );

        return response()->json($payslip->load(['user', 'generatedBy', 'payrollStructure']), 201);
    }

    public function payNow(Request $request)
    {
        $request->validate([
            'payslip_ids' => 'required|array|min:1',
            'payslip_ids.*' => 'integer',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }
        if (!$this->canManagePayroll($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $payslips = Payslip::where('organization_id', $currentUser->organization_id)
            ->whereIn('id', collect($request->payslip_ids)->map(fn ($id) => (int) $id)->values())
            ->get();
        if ($payslips->isEmpty()) {
            return response()->json(['message' => 'No valid payslips found for payment'], 404);
        }

        $toPay = $payslips->filter(fn (Payslip $payslip) => $payslip->payment_status !== 'paid')->values();
        if ($toPay->isEmpty()) {
            return response()->json([
                'message' => 'Selected payslips are already paid.',
                'paid_count' => 0,
            ]);
        }

        DB::transaction(function () use ($toPay, $currentUser) {
            foreach ($toPay as $payslip) {
                $payslip->update([
                    'payment_status' => 'paid',
                    'paid_at' => now(),
                    'paid_by' => $currentUser->id,
                ]);
            }
        });

        $freshPayslips = Payslip::whereIn('id', $toPay->pluck('id'))->get();
        $userGroups = $freshPayslips->groupBy('user_id');
        foreach ($userGroups as $userId => $userPayslips) {
            $total = round((float) $userPayslips->sum('net_salary'), 2);
            $currency = (string) ($userPayslips->first()->currency ?: 'INR');
            $periods = $userPayslips->pluck('period_month')->unique()->sort()->values()->join(', ');

            $this->notificationService->sendToUsers(
                organizationId: (int) $currentUser->organization_id,
                userIds: collect([(int) $userId]),
                senderId: (int) $currentUser->id,
                type: 'salary_credited',
                title: 'Salary Credited',
                message: "Your salary has been credited for period(s): {$periods}.",
                meta: [
                    'currency' => $currency,
                    'total_amount' => $total,
                    'periods' => $userPayslips->pluck('period_month')->unique()->values()->all(),
                    'payslip_ids' => $userPayslips->pluck('id')->values()->all(),
                ]
            );
        }

        return response()->json([
            'message' => 'Payment processed and notifications sent.',
            'paid_count' => $freshPayslips->count(),
        ]);
    }

    public function showPayslip(Request $request, int $id)
    {
        $payslip = $this->findPayslip($request, $id);
        if (!$payslip) {
            return response()->json(['message' => 'Payslip not found'], 404);
        }

        return response()->json($payslip->load(['user', 'generatedBy', 'payrollStructure']));
    }

    public function downloadPayslipPdf(Request $request, int $id)
    {
        $payslip = $this->findPayslip($request, $id);
        if (!$payslip) {
            return response()->json(['message' => 'Payslip not found'], 404);
        }

        $payslip->load(['user', 'generatedBy']);
        $html = View::make('payslips.pdf', ['payslip' => $payslip])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $fileName = 'payslip-'.$payslip->user->name.'-'.$payslip->period_month.'.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    private function resolvePayrollStructure(int $organizationId, int $userId, Carbon $periodStart, ?int $structureId): ?PayrollStructure
    {
        $query = PayrollStructure::with(['allowances', 'deductions'])
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId);

        if ($structureId) {
            return $query->where('id', $structureId)->first();
        }

        return $query
            ->whereDate('effective_from', '<=', $periodStart->toDateString())
            ->where(function ($q) use ($periodStart) {
                $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $periodStart->toDateString());
            })
            ->orderByDesc('effective_from')
            ->first();
    }

    private function computeComponents(array $items, float $basicSalary): array
    {
        $rows = [];
        $total = 0.0;

        foreach ($items as $item) {
            $type = (string) ($item['calculation_type'] ?? 'fixed');
            $amount = (float) ($item['amount'] ?? 0);
            $computed = $type === 'percentage'
                ? round(($basicSalary * $amount) / 100, 2)
                : round($amount, 2);

            $rows[] = [
                'name' => (string) ($item['name'] ?? 'Component'),
                'calculation_type' => $type,
                'value' => $amount,
                'computed_amount' => $computed,
            ];
            $total += $computed;
        }

        return [$rows, round($total, 2)];
    }

    private function findPayslip(Request $request, int $id): ?Payslip
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return null;
        }

        $query = Payslip::where('organization_id', $currentUser->organization_id)->where('id', $id);
        if (!$this->canManagePayroll($currentUser)) {
            $query->where('user_id', $currentUser->id);
        }

        return $query->first();
    }

    private function canManagePayroll(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
    }
}
