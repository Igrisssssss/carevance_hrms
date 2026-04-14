<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollAdjustment extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'payroll_profile_id',
        'reimbursement_id',
        'title',
        'description',
        'kind',
        'source',
        'effective_month',
        'amount',
        'currency',
        'status',
        'created_by',
        'approved_by',
        'applied_run_id',
        'applied_by',
        'rejected_by',
        'approved_at',
        'rejected_at',
        'applied_at',
        'approval_note',
        'rejection_reason',
        'attachment_meta',
        'approval_trail',
        'claim_reference',
        'claim_category',
        'merchant_name',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'applied_at' => 'datetime',
            'attachment_meta' => 'array',
            'approval_trail' => 'array',
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

    public function payrollProfile(): BelongsTo
    {
        return $this->belongsTo(PayrollProfile::class);
    }

    public function reimbursement(): BelongsTo
    {
        return $this->belongsTo(Reimbursement::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function appliedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function appliedRun(): BelongsTo
    {
        return $this->belongsTo(PayRun::class, 'applied_run_id');
    }
}
