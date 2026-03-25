<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryTemplateComponent extends Model
{
    protected $fillable = [
        'salary_template_id',
        'salary_component_id',
        'value_type',
        'value',
        'sort_order',
        'is_enabled',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'sort_order' => 'integer',
            'is_enabled' => 'boolean',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SalaryTemplate::class, 'salary_template_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class, 'salary_component_id');
    }
}
