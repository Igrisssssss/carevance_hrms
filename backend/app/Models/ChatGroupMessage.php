<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatGroupMessage extends Model
{
    protected $fillable = [
        'group_id',
        'sender_id',
        'body',
        'edited_at',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'attachment_size',
    ];

    protected $casts = [
        'edited_at' => 'datetime',
        'attachment_size' => 'integer',
    ];

    protected $appends = [
        'has_attachment',
        'is_edited',
        'reactions',
    ];

    protected $hidden = [
        'reactionEntries',
        'reaction_entries',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(ChatGroup::class, 'group_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reactionEntries(): HasMany
    {
        return $this->hasMany(ChatGroupMessageReaction::class, 'group_message_id');
    }

    public function getHasAttachmentAttribute(): bool
    {
        return !empty($this->attachment_path);
    }

    public function getIsEditedAttribute(): bool
    {
        return !empty($this->edited_at);
    }

    public function getReactionsAttribute(): array
    {
        $reactions = $this->relationLoaded('reactionEntries')
            ? $this->reactionEntries
            : $this->reactionEntries()->get();

        $viewerId = (int) (auth()->id() ?? 0);

        return $reactions
            ->groupBy('emoji')
            ->map(function ($group, $emoji) use ($viewerId) {
                return [
                    'emoji' => (string) $emoji,
                    'count' => $group->count(),
                    'reacted_by_me' => $viewerId > 0 ? $group->contains(fn (ChatGroupMessageReaction $reaction) => (int) $reaction->user_id === $viewerId) : false,
                ];
            })
            ->values()
            ->all();
    }
}
