<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollProfile extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'payroll_code',
        'salary_template_id',
        'currency',
        'pay_group',
        'payout_method',
        'bank_name',
        'bank_account_number',
        'bank_ifsc_swift',
        'payment_email',
        'bank_verification_status',
        'tax_identifier',
        'tax_regime',
        'pan_or_tax_id',
        'pf_account_number',
        'uan',
        'esi_number',
        'professional_tax_state',
        'professional_tax_jurisdiction',
        'payroll_start_date',
        'declaration_status',
        'payout_readiness_status',
        'compliance_readiness_status',
        'payroll_eligible',
        'reimbursements_eligible',
        'is_active',
        'earning_components',
        'deduction_components',
        'bonus_amount',
        'tax_amount',
        'compliance_overrides',
        'declaration_snapshot',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'payroll_eligible' => 'boolean',
            'reimbursements_eligible' => 'boolean',
            'is_active' => 'boolean',
            'earning_components' => 'array',
            'deduction_components' => 'array',
            'bonus_amount' => 'float',
            'tax_amount' => 'float',
            'payroll_start_date' => 'date',
            'compliance_overrides' => 'array',
            'declaration_snapshot' => 'array',
            'meta' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function salaryTemplate(): BelongsTo
    {
        return $this->belongsTo(SalaryTemplate::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(PayrollAdjustment::class);
    }

    public function taxDeclarations(): HasMany
    {
        return $this->hasMany(PayrollTaxDeclaration::class);
    }
}
