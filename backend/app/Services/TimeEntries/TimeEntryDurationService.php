<?php

namespace App\Services\TimeEntries;

use Carbon\Carbon;

class TimeEntryDurationService
{
    public function effectiveDuration(object|array $entry, ?Carbon $resolvedEnd = null): int
    {
        $storedDuration = max(0, (int) data_get($entry, 'duration', 0));
        $startTime = data_get($entry, 'start_time');

        if (! $startTime) {
            return $storedDuration;
        }

        $start = Carbon::parse($startTime);
        $endTime = data_get($entry, 'end_time');

        if ($endTime) {
            return (int) max(
                $storedDuration,
                $start->diffInSeconds(Carbon::parse($endTime))
            );
        }

        $resolvedEnd = $resolvedEnd ?: now();

        return (int) max(
            $storedDuration,
            $start->diffInSeconds($resolvedEnd)
        );
    }

    public function sumEffectiveDuration(iterable $entries, ?Carbon $resolvedEnd = null): int
    {
        $total = 0;

        foreach ($entries as $entry) {
            $total += $this->effectiveDuration($entry, $resolvedEnd);
        }

        return (int) $total;
    }
}
