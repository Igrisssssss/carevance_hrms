<?php

namespace App\Services\Reports;

class TimeBreakdownService
{
    public function build(int $trackedDuration, int $idleDuration): array
    {
        $totalDuration = max(0, $trackedDuration);
        $normalizedIdleDuration = min(max(0, $idleDuration), $totalDuration);
        $workingDuration = max($totalDuration - $normalizedIdleDuration, 0);

        return [
            'total_duration' => $totalDuration,
            'working_time' => $workingDuration,
            'working_duration' => $workingDuration,
            'working_hours' => round($workingDuration / 3600, 2),
            'billable_time' => $workingDuration,
            'billable_duration' => $workingDuration,
            'billable_hours' => round($workingDuration / 3600, 2),
            'idle_time' => $normalizedIdleDuration,
            'idle_duration' => $normalizedIdleDuration,
            'idle_hours' => round($normalizedIdleDuration / 3600, 2),
            'non_working_duration' => $normalizedIdleDuration,
            'non_billable_duration' => $normalizedIdleDuration,
            'working_percentage' => $totalDuration > 0
                ? (float) round(($workingDuration / $totalDuration) * 100, 2)
                : 0.0,
            'idle_percentage' => $totalDuration > 0
                ? (float) round(($normalizedIdleDuration / $totalDuration) * 100, 2)
                : 0.0,
        ];
    }

    public function productivityScore(int $trackedDuration, int $idleDuration): int
    {
        return (int) round($this->build($trackedDuration, $idleDuration)['working_percentage']);
    }
}
