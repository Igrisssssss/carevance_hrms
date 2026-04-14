<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollSetting extends Model
{
    protected $fillable = [
        'organization_id',
        'payroll_calendar',
        'default_payout_method',
        'overtime_rules',
        'late_deduction_rules',
        'leave_mapping',
        'adjustment_rules',
        'approval_workflow',
        'compliance_settings',
        'tax_settings',
        'payslip_branding',
        'payslip_issue_rules',
        'payout_workflow',
    ];

    protected function casts(): array
    {
        return [
            'payroll_calendar' => 'array',
            'default_payout_method' => 'array',
            'overtime_rules' => 'array',
            'late_deduction_rules' => 'array',
            'leave_mapping' => 'array',
            'adjustment_rules' => 'array',
            'approval_workflow' => 'array',
            'compliance_settings' => 'array',
            'tax_settings' => 'array',
            'payslip_branding' => 'array',
            'payslip_issue_rules' => 'array',
            'payout_workflow' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
