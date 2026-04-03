<?php

namespace Tests\Unit;

use App\Services\Reports\UsageProcessingService;
use Tests\TestCase;

class UsageProcessingServiceTest extends TestCase
{
    public function test_instagram_two_minutes_is_counted_as_unproductive(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildUsageSummary([
            $this->log(1, 1, 'url', 'https://instagram.com/reel/1', 120, '2026-03-16 10:02:00'),
        ]);

        $this->assertSame(120, $summary['metrics']['total_time']);
        $this->assertSame(120, $summary['metrics']['unproductive_time']);
        $this->assertSame('instagram.com', $summary['tools']['unproductive'][0]['label']);
    }

    public function test_switching_between_vscode_and_instagram_does_not_double_count_overlap(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildUsageSummary([
            $this->log(1, 1, 'app', 'Visual Studio Code', 120, '2026-03-16 10:02:00'),
            $this->log(2, 1, 'url', 'https://instagram.com/reel/1', 120, '2026-03-16 10:03:00'),
        ]);

        $this->assertSame(180, $summary['metrics']['total_time']);
        $this->assertSame(60, $summary['metrics']['productive_time']);
        $this->assertSame(120, $summary['metrics']['unproductive_time']);
    }

    public function test_five_minutes_of_idle_is_excluded_from_worked_time(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildUsageSummary([
            $this->log(1, 1, 'app', 'Visual Studio Code', 600, '2026-03-16 10:10:00'),
            $this->log(2, 1, 'idle', 'System Idle - Visual Studio Code', 300, '2026-03-16 10:10:00'),
        ]);

        $this->assertSame(300, $summary['metrics']['total_time']);
        $this->assertSame(300, $summary['metrics']['productive_time']);
        $this->assertSame(300, $summary['metrics']['idle_time']);
    }

    public function test_duplicate_logs_are_collapsed_into_a_single_interval(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildUsageSummary([
            $this->log(1, 1, 'url', 'Instagram', 120, '2026-03-16 10:57:00'),
            $this->log(2, 1, 'url', 'Instagram', 125, '2026-03-16 10:57:04'),
        ]);

        $this->assertSame(125, $summary['metrics']['total_time']);
        $this->assertSame(125, $summary['metrics']['unproductive_time']);
        $this->assertSame(125, $summary['tools']['unproductive'][0]['total_duration']);
    }

    public function test_same_tab_reload_is_treated_as_continuous_usage_when_gap_is_under_five_seconds(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildUsageSummary([
            $this->log(1, 1, 'url', 'Search | LinkedIn', 30, '2026-03-16 10:00:30'),
            $this->log(2, 1, 'url', 'Feed | LinkedIn', 30, '2026-03-16 10:01:03'),
        ]);

        $this->assertSame(63, $summary['metrics']['total_time']);
        $this->assertSame(63, $summary['metrics']['neutral_time']);
        $this->assertSame('linkedin.com', $summary['tools']['neutral'][0]['label']);
    }

    public function test_multiple_linkedin_entries_are_grouped_into_one_tool_row(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildUsageSummary([
            $this->log(1, 1, 'url', 'Search | LinkedIn', 120, '2026-03-16 10:10:00'),
            $this->log(2, 1, 'url', 'Feed | LinkedIn', 60, '2026-03-16 10:12:00'),
        ]);

        $this->assertCount(1, $summary['tools']['neutral']);
        $this->assertSame('linkedin.com', $summary['tools']['neutral'][0]['label']);
        $this->assertSame(180, $summary['tools']['neutral'][0]['total_duration']);
    }

    public function test_web_app_usage_keeps_full_unproductive_duration_during_idle(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildWebAppUsageSummary([
            $this->log(1, 1, 'url', 'https://instagram.com/reel/1', 135, '2026-03-16 10:02:15'),
            $this->log(2, 1, 'idle', 'System Idle - Chrome', 120, '2026-03-16 10:02:15'),
        ]);

        $this->assertSame(135, $summary['metrics']['total_time']);
        $this->assertSame(135, $summary['metrics']['unproductive_time']);
        $this->assertSame(120, $summary['metrics']['idle_time']);
        $this->assertSame(135, $summary['tools']['unproductive'][0]['total_duration']);
    }

    public function test_web_app_usage_stops_counting_unproductive_time_on_focus_switch(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildWebAppUsageSummary([
            $this->log(1, 1, 'url', 'instagram.com', 120, '2026-03-16 10:02:00'),
            $this->log(2, 1, 'app', 'Visual Studio Code', 60, '2026-03-16 10:03:00'),
        ]);

        $this->assertSame(180, $summary['metrics']['total_time']);
        $this->assertSame(120, $summary['metrics']['unproductive_time']);
        $this->assertSame(60, $summary['metrics']['productive_time']);
        $this->assertSame(120, $summary['tools']['unproductive'][0]['total_duration']);
    }

    public function test_web_app_usage_recovers_full_idle_only_unproductive_interval_from_idle_context(): void
    {
        $service = app(UsageProcessingService::class);

        $summary = $service->buildWebAppUsageSummary([
            $this->log(1, 1, 'url', 'Instagram', 120, '2026-03-16 10:02:00'),
            $this->log(2, 1, 'idle', 'System Idle - Instagram', 180, '2026-03-16 10:03:00'),
        ]);

        $this->assertSame(180, $summary['metrics']['total_time']);
        $this->assertSame(180, $summary['metrics']['unproductive_time']);
        $this->assertSame(180, $summary['metrics']['idle_time']);
        $this->assertSame('instagram.com', $summary['tools']['unproductive'][0]['label']);
        $this->assertSame(180, $summary['tools']['unproductive'][0]['total_duration']);
    }

    private function log(int $id, int $timeEntryId, string $type, string $name, int $duration, string $recordedAt): array
    {
        return [
            'id' => $id,
            'user_id' => 1,
            'time_entry_id' => $timeEntryId,
            'type' => $type,
            'name' => $name,
            'duration' => $duration,
            'recorded_at' => $recordedAt,
        ];
    }
}
