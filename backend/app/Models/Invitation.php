<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invitation extends Model
{
    protected $fillable = [
        'organization_id',
        'email',
        'role',
        'token_hash',
        'invited_by',
        'status',
        'settings',
        'metadata',
        'delivery_method',
        'email_sent_at',
        'expires_at',
        'accepted_at',
        'accepted_by_user_id',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'metadata' => 'array',
            'email_sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public static function generatePublicToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    public static function hashPublicToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function markExpiredIfNeeded(): void
    {
        if ($this->status === 'pending' && $this->expires_at?->isPast()) {
            $this->forceFill(['status' => 'expired'])->save();
        }
    }
}
