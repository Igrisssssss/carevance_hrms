<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayRun extends Model
{
    protected $fillable = [
        'organization_id',
        'run_code',
        'payroll_month',
        'status',
        'currency',
        'generated_by',
        'approved_by',
        'validated_by',
        'manager_approved_by',
        'finance_approved_by',
        'processed_by',
        'paid_by',
        'generated_at',
        'validated_at',
        'approved_at',
        'manager_approved_at',
        'finance_approved_at',
        'finalized_at',
        'locked_at',
        'processed_at',
        'paid_at',
        'summary',
        'warnings',
        'approval_config',
        'approval_summary',
    ];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
            'validated_at' => 'datetime',
            'approved_at' => 'datetime',
            'manager_approved_at' => 'datetime',
            'finance_approved_at' => 'datetime',
            'finalized_at' => 'datetime',
            'locked_at' => 'datetime',
            'processed_at' => 'datetime',
            'paid_at' => 'datetime',
            'summary' => 'array',
            'warnings' => 'array',
            'approval_config' => 'array',
            'approval_summary' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function managerApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_approved_by');
    }

    public function financeApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finance_approved_by');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayRunItem::class)->orderBy('id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(PayRunApproval::class)->orderBy('id');
    }
}
