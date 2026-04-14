<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'payroll_structure_id',
        'payroll_id',
        'pay_run_id',
        'period_month',
        'currency',
        'basic_salary',
        'total_allowances',
        'total_deductions',
        'net_salary',
        'payment_status',
        'publish_status',
        'allowances',
        'deductions',
        'breakdown',
        'compliance_breakdown',
        'generated_by',
        'generated_at',
        'issued_at',
        'published_at',
        'unpublished_at',
        'viewed_at',
        'paid_at',
        'paid_by',
        'payment_reference',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'float',
            'total_allowances' => 'float',
            'total_deductions' => 'float',
            'net_salary' => 'float',
            'allowances' => 'array',
            'deductions' => 'array',
            'breakdown' => 'array',
            'compliance_breakdown' => 'array',
            'generated_at' => 'datetime',
            'issued_at' => 'datetime',
            'published_at' => 'datetime',
            'unpublished_at' => 'datetime',
            'viewed_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function payrollStructure(): BelongsTo
    {
        return $this->belongsTo(PayrollStructure::class);
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function payRun(): BelongsTo
    {
        return $this->belongsTo(PayRun::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
