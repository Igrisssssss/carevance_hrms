<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductivityRule extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'target_type',
        'match_mode',
        'target_value',
        'classification',
        'priority',
        'scope_type',
        'scope_id',
        'is_active',
        'reason',
        'notes',
    ];

    protected $casts = [
        'organization_id' => 'integer',
        'priority' => 'integer',
        'scope_id' => 'integer',
        'is_active' => 'boolean',
    ];
}
