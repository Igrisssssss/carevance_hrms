<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Screenshot extends Model
{
    protected $fillable = ['time_entry_id', 'filename', 'thumbnail', 'blurred'];

    protected $casts = [
        'blurred' => 'boolean',
    ];

    protected $appends = ['path', 'recorded_at'];

    public function timeEntry(): BelongsTo
    {
        return $this->belongsTo(TimeEntry::class);
    }

    public function getPathAttribute(): string
    {
        $request = request();
        $baseUrl = $request
            ? rtrim($request->getSchemeAndHttpHost(), '/')
            : rtrim((string) config('app.url'), '/');

        return $baseUrl.'/storage/screenshots/'.$this->filename;
    }

    public function getRecordedAtAttribute(): string
    {
        return (string) $this->created_at;
    }
}
