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
        'effective_month',
        'amount',
        'currency',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'applied_at',
        'approval_note',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'approved_at' => 'datetime',
            'applied_at' => 'datetime',
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
}
