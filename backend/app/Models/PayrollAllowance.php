<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollAllowance extends Model
{
    protected $fillable = [
        'payroll_structure_id',
        'name',
        'calculation_type',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
        ];
    }

    public function payrollStructure(): BelongsTo
    {
        return $this->belongsTo(PayrollStructure::class);
    }
}
