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
        'salary_template_id',
        'currency',
        'payout_method',
        'bank_name',
        'bank_account_number',
        'bank_ifsc_swift',
        'payment_email',
        'tax_identifier',
        'payroll_eligible',
        'reimbursements_eligible',
        'is_active',
        'earning_components',
        'deduction_components',
        'bonus_amount',
        'tax_amount',
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
}
