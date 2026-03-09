<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatGroupTypingStatus extends Model
{
    protected $fillable = [
        'group_id',
        'user_id',
        'typing_until',
    ];

    protected $casts = [
        'typing_until' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(ChatGroup::class, 'group_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
