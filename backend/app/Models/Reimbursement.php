<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Reimbursement extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'title',
        'description',
        'expense_date',
        'amount',
        'currency',
        'status',
        'submitted_by',
        'approved_by',
        'approved_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'float',
            'approved_at' => 'datetime',
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

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payrollAdjustment(): HasOne
    {
        return $this->hasOne(PayrollAdjustment::class);
    }
}
