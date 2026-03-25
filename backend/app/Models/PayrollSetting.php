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
        'approval_workflow',
        'payslip_branding',
    ];

    protected function casts(): array
    {
        return [
            'payroll_calendar' => 'array',
            'default_payout_method' => 'array',
            'overtime_rules' => 'array',
            'late_deduction_rules' => 'array',
            'leave_mapping' => 'array',
            'approval_workflow' => 'array',
            'payslip_branding' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
