<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    protected $fillable = ['invoice_id', 'time_entry_id', 'description', 'hours', 'rate', 'amount'];

    protected $casts = [
        'hours' => 'integer',
        'rate' => 'decimal:2',
        'amount' => 'decimal:2',
    ];

    protected $appends = ['quantity'];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function getQuantityAttribute(): int
    {
        return (int) $this->hours;
    }
}
