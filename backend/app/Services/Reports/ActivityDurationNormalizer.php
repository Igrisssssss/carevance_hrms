<?php

namespace App\Services\Reports;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class ActivityDurationNormalizer
{
    private const SEGMENT_START_TOLERANCE_SECONDS = 15;

    public function collapse(iterable $activities, ?callable $signatureResolver = null): Collection
    {
        $signatureResolver ??= fn ($activity) => $this->defaultSignature($activity);

        $rows = collect($activities)
            ->map(function ($activity) use ($signatureResolver) {
                $recordedAt = $this->resolveRecordedAt($activity);
                $duration = max(0, (int) data_get($activity, 'duration', 0));

                if (!$recordedAt || $duration <= 0) {
                    return null;
                }

                return [
                    'id' => (int) data_get($activity, 'id', 0),
                    'user_id' => (int) data_get($activity, 'user_id', 0),
                    'time_entry_id' => (int) data_get($activity, 'time_entry_id', 0),
                    'type' => strtolower(trim((string) data_get($activity, 'type', 'app'))),
                    'name' => (string) data_get($activity, 'name', ''),
                    'duration' => $duration,
                    'recorded_at' => $recordedAt,
                    'anchor_timestamp' => $recordedAt->copy()->subSeconds($duration)->getTimestamp(),
                    'signature' => (string) $signatureResolver($activity),
                    'raw_events_count' => 1,
                ];
            })
            ->filter()
            ->sort(function (array $left, array $right) {
                return [
                    $left['user_id'],
                    $left['time_entry_id'],
                    $left['signature'],
                    $left['recorded_at']->getTimestamp(),
                    $left['id'],
                ] <=> [
                    $right['user_id'],
                    $right['time_entry_id'],
                    $right['signature'],
                    $right['recorded_at']->getTimestamp(),
                    $right['id'],
                ];
            })
            ->values();

        $collapsed = [];
        $segmentsBySignature = [];

        foreach ($rows as $row) {
            $signature = $row['signature'];
            $segmentIndex = $this->findMatchingSegmentIndex(
                $segmentsBySignature[$signature] ?? [],
                (int) $row['anchor_timestamp']
            );

            if ($segmentIndex === null) {
                $collapsed[] = $row;
                $segmentsBySignature[$signature][] = [
                    'row_index' => count($collapsed) - 1,
                    'anchor_timestamp' => (int) $row['anchor_timestamp'],
                ];
                continue;
            }

            $rowIndex = $segmentsBySignature[$signature][$segmentIndex]['row_index'];
            $current = $collapsed[$rowIndex];

            $collapsed[$rowIndex]['duration'] = max((int) $current['duration'], (int) $row['duration']);
            $collapsed[$rowIndex]['raw_events_count'] = (int) $current['raw_events_count'] + 1;

            if ($row['recorded_at']->greaterThan($current['recorded_at'])) {
                $collapsed[$rowIndex]['recorded_at'] = $row['recorded_at'];
                $collapsed[$rowIndex]['name'] = $row['name'] !== '' ? $row['name'] : $current['name'];
                $collapsed[$rowIndex]['id'] = max((int) $current['id'], (int) $row['id']);
            }

            $segmentsBySignature[$signature][$segmentIndex]['anchor_timestamp'] = (int) round(
                (
                    $segmentsBySignature[$signature][$segmentIndex]['anchor_timestamp']
                    + (int) $row['anchor_timestamp']
                ) / 2
            );
        }

        return collect($collapsed)
            ->map(function (array $row) {
                unset($row['anchor_timestamp'], $row['signature']);

                return $row;
            })
            ->values();
    }

    public function collapseIdle(iterable $activities): Collection
    {
        return $this->collapse(
            collect($activities)->filter(fn ($activity) => strtolower(trim((string) data_get($activity, 'type', ''))) === 'idle'),
            fn ($activity) => implode('|', [
                (int) data_get($activity, 'user_id', 0),
                (int) data_get($activity, 'time_entry_id', 0),
                'idle',
            ])
        );
    }

    public function sumIdleDuration(iterable $activities): int
    {
        return (int) $this->collapseIdle($activities)->sum('duration');
    }

    private function defaultSignature(mixed $activity): string
    {
        return implode('|', [
            (int) data_get($activity, 'user_id', 0),
            (int) data_get($activity, 'time_entry_id', 0),
            strtolower(trim((string) data_get($activity, 'type', 'app'))),
            trim((string) data_get($activity, 'name', '')),
        ]);
    }

    private function findMatchingSegmentIndex(array $segments, int $anchorTimestamp): ?int
    {
        foreach ($segments as $index => $segment) {
            if (abs(((int) ($segment['anchor_timestamp'] ?? 0)) - $anchorTimestamp) <= self::SEGMENT_START_TOLERANCE_SECONDS) {
                return $index;
            }
        }

        return null;
    }

    private function resolveRecordedAt(mixed $activity): ?Carbon
    {
        $value = data_get($activity, 'recorded_at');

        if ($value instanceof Carbon) {
            return $value->copy();
        }

        if (is_string($value) && trim($value) !== '') {
            return Carbon::parse($value);
        }

        return null;
    }
}
