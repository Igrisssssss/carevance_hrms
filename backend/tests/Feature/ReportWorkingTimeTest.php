<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Organization;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ReportWorkingTimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_overall_report_uses_idle_time_to_compute_working_time(): void
    {
        [$user, $headers] = $this->createAuthenticatedEmployee('admin');

        $entry = TimeEntry::create([
            'user_id' => $user->id,
            'start_time' => '2026-03-10 09:00:00',
            'end_time' => '2026-03-10 11:00:00',
            'duration' => 7200,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $user->id,
            'time_entry_id' => $entry->id,
            'type' => 'idle',
            'name' => 'System Idle - Test',
            'duration' => 1800,
            'recorded_at' => '2026-03-10 10:00:00',
        ]);

        $response = $this->getJson('/api/reports/overall?start_date=2026-03-10&end_date=2026-03-10', $headers);

        $response
            ->assertOk()
            ->assertJsonPath('summary.total_duration', 7200)
            ->assertJsonPath('summary.working_duration', 5400)
            ->assertJsonPath('summary.billable_duration', 5400)
            ->assertJsonPath('summary.idle_duration', 1800)
            ->assertJsonPath('by_user.0.total_duration', 7200)
            ->assertJsonPath('by_user.0.working_duration', 5400)
            ->assertJsonPath('by_user.0.idle_duration', 1800)
            ->assertJsonPath('by_day.0.total_duration', 7200)
            ->assertJsonPath('by_day.0.working_duration', 5400)
            ->assertJsonPath('by_day.0.idle_duration', 1800);

        $this->assertSame(25.0, (float) $response->json('summary.idle_percentage'));
    }

    public function test_productivity_endpoint_reports_working_time_minus_idle_time(): void
    {
        [$user, $headers] = $this->createAuthenticatedEmployee();

        $entry = TimeEntry::create([
            'user_id' => $user->id,
            'start_time' => '2026-03-10 09:00:00',
            'end_time' => '2026-03-10 11:00:00',
            'duration' => 7200,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $user->id,
            'time_entry_id' => $entry->id,
            'type' => 'idle',
            'name' => 'System Idle - Test',
            'duration' => 1800,
            'recorded_at' => '2026-03-10 10:00:00',
        ]);

        $this->getJson('/api/reports/productivity?start_date=2026-03-10&end_date=2026-03-10', $headers)
            ->assertOk()
            ->assertJsonPath('productivity_score', 75)
            ->assertJsonPath('tracked_time', 7200)
            ->assertJsonPath('working_time', 5400)
            ->assertJsonPath('active_time', 5400)
            ->assertJsonPath('idle_time', 1800);
    }

    public function test_dashboard_summary_uses_working_ratio_for_productivity_score(): void
    {
        [$user, $headers] = $this->createAuthenticatedEmployee();

        $entry = TimeEntry::create([
            'user_id' => $user->id,
            'start_time' => now()->subHours(3),
            'end_time' => now()->subHour(),
            'duration' => 7200,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $user->id,
            'time_entry_id' => $entry->id,
            'type' => 'idle',
            'name' => 'System Idle - Dashboard',
            'duration' => 1800,
            'recorded_at' => now()->subHours(2),
        ]);

        $this->getJson('/api/dashboard', $headers)
            ->assertOk()
            ->assertJsonPath('productivity_score', 75);
    }

    public function test_admin_overall_report_counts_live_duration_for_open_time_entries(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-16 11:15:00'));

        try {
            [$admin, $employee, $headers] = $this->createAdminAndEmployee();
            $entry = $this->createOpenEntryFor($employee);

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $entry->id,
                'type' => 'idle',
                'name' => 'System Idle - Admin',
                'duration' => 300,
                'recorded_at' => '2026-03-16 11:00:00',
            ]);

            $query = http_build_query([
                'start_date' => '2026-03-16',
                'end_date' => '2026-03-16',
                'user_ids' => [$employee->id],
            ]);

            $this->getJson("/api/reports/overall?{$query}", $headers)
                ->assertOk()
                ->assertJsonPath('summary.total_duration', 1800)
                ->assertJsonPath('summary.working_duration', 1500)
                ->assertJsonPath('summary.idle_duration', 300)
                ->assertJsonPath('by_user.0.user.id', $employee->id)
                ->assertJsonPath('by_user.0.total_duration', 1800)
                ->assertJsonPath('by_user.0.working_duration', 1500)
                ->assertJsonPath('by_day.0.total_duration', 1800)
                ->assertJsonPath('by_day.0.working_duration', 1500);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_profile360_counts_live_duration_for_open_time_entries(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-16 11:15:00'));

        try {
            [$admin, $employee, $headers] = $this->createAdminAndEmployee();
            $entry = $this->createOpenEntryFor($employee);

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $entry->id,
                'type' => 'idle',
                'name' => 'System Idle - Profile',
                'duration' => 300,
                'recorded_at' => '2026-03-16 11:00:00',
            ]);

            $this->getJson("/api/users/{$employee->id}/profile-360?start_date=2026-03-16&end_date=2026-03-16", $headers)
                ->assertOk()
                ->assertJsonPath('summary.total_duration', 1800)
                ->assertJsonPath('summary.working_duration', 1500)
                ->assertJsonPath('summary.idle_duration', 300)
                ->assertJsonPath('recent_time_entries.0.duration', 1800)
                ->assertJsonPath('status.is_working', true);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_employee_insights_counts_live_duration_for_open_time_entries(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-16 11:15:00'));

        try {
            [$admin, $employee, $headers] = $this->createAdminAndEmployee();
            $entry = $this->createOpenEntryFor($employee);

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $entry->id,
                'type' => 'idle',
                'name' => 'System Idle - Insights',
                'duration' => 300,
                'recorded_at' => '2026-03-16 11:00:00',
            ]);

            $this->getJson("/api/reports/employee-insights?start_date=2026-03-16&end_date=2026-03-16&user_id={$employee->id}", $headers)
                ->assertOk()
                ->assertJsonPath('stats.total_duration', 1800)
                ->assertJsonPath('stats.working_duration', 1500)
                ->assertJsonPath('stats.idle_total_duration', 300)
                ->assertJsonPath('live_monitoring.selected_user.is_working', true);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_admin_time_entries_index_returns_selected_employee_live_duration(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-16 11:15:00'));

        try {
            [$admin, $employee, $headers] = $this->createAdminAndEmployee();
            $this->createOpenEntryFor($employee);
            $this->createOpenEntryFor($admin, '2026-03-16 11:10:00');

            $this->getJson("/api/time-entries?user_id={$employee->id}&start_date=2026-03-16&end_date=2026-03-16", $headers)
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.user_id', $employee->id)
                ->assertJsonPath('data.0.duration', 1800);
        } finally {
            Carbon::setTestNow();
        }
    }

    private function createAuthenticatedEmployee(string $role = 'employee'): array
    {
        $organization = Organization::create([
            'name' => 'CareVance Org',
            'slug' => 'carevance-org',
        ]);

        $user = User::create([
            'name' => 'Ayush',
            'email' => 'ayush@example.com',
            'password' => Hash::make('password123'),
            'role' => $role,
            'organization_id' => $organization->id,
        ]);

        return [$user, $this->apiHeadersFor($user)];
    }

    private function createAdminAndEmployee(): array
    {
        $organization = Organization::create([
            'name' => 'CareVance Org',
            'slug' => 'carevance-org',
        ]);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $employee = User::create([
            'name' => 'Smit',
            'email' => 'smit@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        return [$admin, $employee, $this->apiHeadersFor($admin)];
    }

    private function createOpenEntryFor(User $user, string $startTime = '2026-03-16 10:45:00'): TimeEntry
    {
        return TimeEntry::create([
            'user_id' => $user->id,
            'start_time' => $startTime,
            'end_time' => null,
            'duration' => 0,
            'billable' => true,
        ]);
    }
}
