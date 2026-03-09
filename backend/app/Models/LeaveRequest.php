<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'start_date',
        'end_date',
        'reason',
        'status',
        'revoke_status',
        'revoke_requested_at',
        'revoke_reviewed_by',
        'revoke_reviewed_at',
        'revoke_review_note',
        'reviewed_by',
        'reviewed_at',
        'review_note',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'reviewed_at' => 'datetime',
            'revoke_requested_at' => 'datetime',
            'revoke_reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function revokeReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoke_reviewed_by');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
