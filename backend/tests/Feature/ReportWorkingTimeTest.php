<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\AttendanceRecord;
use App\Models\AttendanceTimeEditRequest;
use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\Payslip;
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

    public function test_duplicate_idle_snapshots_are_counted_once_in_time_breakdowns(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-16 11:15:00'));

        try {
            [$admin, $employee, $headers] = $this->createAdminAndEmployee();
            $entry = $this->createOpenEntryFor($employee);

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $entry->id,
                'type' => 'idle',
                'name' => 'System Idle - Visual Studio Code',
                'duration' => 180,
                'recorded_at' => '2026-03-16 11:03:00',
            ]);

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $entry->id,
                'type' => 'idle',
                'name' => 'System Idle - Visual Studio Code',
                'duration' => 240,
                'recorded_at' => '2026-03-16 11:04:00',
            ]);

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $entry->id,
                'type' => 'idle',
                'name' => 'System Idle - Visual Studio Code',
                'duration' => 244,
                'recorded_at' => '2026-03-16 11:04:05',
            ]);

            $this->getJson('/api/reports/overall?start_date=2026-03-16&end_date=2026-03-16&user_ids[]='.$employee->id, $headers)
                ->assertOk()
                ->assertJsonPath('summary.total_duration', 1800)
                ->assertJsonPath('summary.working_duration', 1556)
                ->assertJsonPath('summary.idle_duration', 244);

            $this->getJson("/api/users/{$employee->id}/profile-360?start_date=2026-03-16&end_date=2026-03-16", $headers)
                ->assertOk()
                ->assertJsonPath('summary.total_duration', 1800)
                ->assertJsonPath('summary.working_duration', 1556)
                ->assertJsonPath('summary.idle_duration', 244);
        } finally {
            Carbon::setTestNow();
        }
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

    public function test_profile360_summary_uses_full_selected_range_for_attendance_and_adjustments(): void
    {
        [$admin, $employee, $headers] = $this->createAdminAndEmployee();

        foreach (range(1, 20) as $day) {
            $date = Carbon::create(2026, 3, $day)->toDateString();
            $isAbsent = in_array($day, [5, 6, 7, 18], true);

            AttendanceRecord::create([
                'organization_id' => $employee->organization_id,
                'user_id' => $employee->id,
                'attendance_date' => $date,
                'check_in_at' => $isAbsent ? null : "{$date} 09:00:00",
                'check_out_at' => $isAbsent ? null : "{$date} 18:00:00",
                'worked_seconds' => $isAbsent ? 0 : 8 * 3600,
                'manual_adjustment_seconds' => 0,
                'late_minutes' => in_array($day, [2, 9, 16], true) ? 10 : 0,
                'status' => $isAbsent ? 'absent' : 'present',
            ]);
        }

        LeaveRequest::create([
            'organization_id' => $employee->organization_id,
            'user_id' => $employee->id,
            'type' => 'annual',
            'start_date' => '2026-03-05',
            'end_date' => '2026-03-07',
            'reason' => 'Approved leave',
            'status' => 'approved',
        ]);

        AttendanceTimeEditRequest::create([
            'organization_id' => $employee->organization_id,
            'user_id' => $employee->id,
            'attendance_date' => '2026-03-18',
            'extra_seconds' => 900,
            'message' => 'Range-scoped edit',
            'status' => 'approved',
        ]);

        AttendanceTimeEditRequest::create([
            'organization_id' => $employee->organization_id,
            'user_id' => $employee->id,
            'attendance_date' => '2026-03-25',
            'extra_seconds' => 1200,
            'message' => 'Outside range edit',
            'status' => 'approved',
        ]);

        Payslip::create([
            'organization_id' => $employee->organization_id,
            'user_id' => $employee->id,
            'period_month' => '2026-03',
            'currency' => 'INR',
            'basic_salary' => 1000,
            'total_allowances' => 0,
            'total_deductions' => 0,
            'net_salary' => 1000,
            'payment_status' => 'paid',
        ]);

        Payslip::create([
            'organization_id' => $employee->organization_id,
            'user_id' => $employee->id,
            'period_month' => '2026-04',
            'currency' => 'INR',
            'basic_salary' => 1000,
            'total_allowances' => 0,
            'total_deductions' => 0,
            'net_salary' => 1000,
            'payment_status' => 'paid',
        ]);

        $this->getJson("/api/users/{$employee->id}/profile-360?start_date=2026-03-01&end_date=2026-03-20", $headers)
            ->assertOk()
            ->assertJsonPath('summary.attendance_days', 20)
            ->assertJsonPath('summary.present_days', 16)
            ->assertJsonPath('summary.absent_days', 4)
            ->assertJsonPath('summary.late_days', 3)
            ->assertJsonPath('summary.approved_leave_days', 3)
            ->assertJsonPath('summary.approved_time_edit_seconds', 900)
            ->assertJsonPath('summary.payslips_count', 1)
            ->assertJsonCount(14, 'attendance_records');
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
                'type' => 'app',
                'name' => 'Visual Studio Code',
                'duration' => 1800,
                'recorded_at' => '2026-03-16 11:15:00',
            ]);

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
                ->assertJsonPath('employee_rankings.by_productive_duration.0.total_duration', 1800)
                ->assertJsonPath('employee_rankings.by_productive_duration.0.working_duration', 1500)
                ->assertJsonPath('live_monitoring.selected_user.is_working', true);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_employee_insights_classifies_browser_window_titles_as_unproductive_tools(): void
    {
        [$admin, $employee, $headers] = $this->createAdminAndEmployee();

        $entry = TimeEntry::create([
            'user_id' => $employee->id,
            'start_time' => '2026-03-16 10:45:00',
            'end_time' => '2026-03-16 11:00:00',
            'duration' => 900,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'url',
            'name' => 'Google Chrome - Instagram - Google Chrome',
            'duration' => 300,
            'recorded_at' => '2026-03-16 10:55:00',
        ]);

        $this->getJson("/api/reports/employee-insights?start_date=2026-03-16&end_date=2026-03-16&user_id={$employee->id}", $headers)
            ->assertOk()
            ->assertJsonPath('selected_user_tools.unproductive.0.label', 'instagram.com')
            ->assertJsonPath('selected_user_tools.unproductive.0.total_duration', 300)
            ->assertJsonPath('organization_summary.unproductive_duration', 300)
            ->assertJsonPath('employee_rankings.by_unproductive_duration.0.unproductive_duration', 300);
    }

    public function test_employee_insights_collapse_duplicate_tool_snapshots_before_reporting_totals(): void
    {
        [$admin, $employee, $headers] = $this->createAdminAndEmployee();

        $entry = TimeEntry::create([
            'user_id' => $employee->id,
            'start_time' => '2026-03-16 10:45:00',
            'end_time' => '2026-03-16 11:00:00',
            'duration' => 900,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'url',
            'name' => 'Instagram',
            'duration' => 120,
            'recorded_at' => '2026-03-16 10:57:00',
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'url',
            'name' => 'Instagram',
            'duration' => 125,
            'recorded_at' => '2026-03-16 10:57:04',
        ]);

        $this->getJson("/api/reports/employee-insights?start_date=2026-03-16&end_date=2026-03-16&user_id={$employee->id}", $headers)
            ->assertOk()
            ->assertJsonPath('selected_user_tools.unproductive.0.label', 'instagram.com')
            ->assertJsonPath('selected_user_tools.unproductive.0.total_duration', 125)
            ->assertJsonPath('organization_summary.unproductive_duration', 125)
            ->assertJsonPath('employee_rankings.by_unproductive_duration.0.unproductive_duration', 125);
    }

    public function test_employee_insights_counts_idle_time_inside_focused_unproductive_tool_duration(): void
    {
        [$admin, $employee, $headers] = $this->createAdminAndEmployee();

        $entry = TimeEntry::create([
            'user_id' => $employee->id,
            'start_time' => '2026-03-16 10:00:00',
            'end_time' => '2026-03-16 10:03:00',
            'duration' => 180,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'url',
            'name' => 'https://instagram.com/reel/1',
            'duration' => 135,
            'recorded_at' => '2026-03-16 10:02:15',
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'idle',
            'name' => 'System Idle - Chrome',
            'duration' => 120,
            'recorded_at' => '2026-03-16 10:02:15',
        ]);

        $this->getJson("/api/reports/employee-insights?start_date=2026-03-16&end_date=2026-03-16&user_id={$employee->id}", $headers)
            ->assertOk()
            ->assertJsonPath('stats.total_duration', 180)
            ->assertJsonPath('stats.working_duration', 60)
            ->assertJsonPath('stats.idle_total_duration', 120)
            ->assertJsonPath('selected_user_tools.unproductive.0.label', 'instagram.com')
            ->assertJsonPath('selected_user_tools.unproductive.0.total_duration', 135)
            ->assertJsonPath('organization_summary.unproductive_duration', 135)
            ->assertJsonPath('employee_rankings.by_unproductive_duration.0.unproductive_duration', 135);
    }

    public function test_employee_insights_recovers_full_unproductive_duration_from_idle_context_when_tracked_segment_is_shorter(): void
    {
        [$admin, $employee, $headers] = $this->createAdminAndEmployee();

        $entry = TimeEntry::create([
            'user_id' => $employee->id,
            'start_time' => '2026-03-16 10:00:00',
            'end_time' => '2026-03-16 10:03:00',
            'duration' => 180,
            'billable' => true,
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'url',
            'name' => 'Instagram',
            'duration' => 120,
            'recorded_at' => '2026-03-16 10:02:00',
        ]);

        Activity::create([
            'user_id' => $employee->id,
            'time_entry_id' => $entry->id,
            'type' => 'idle',
            'name' => 'System Idle - Instagram',
            'duration' => 180,
            'recorded_at' => '2026-03-16 10:03:00',
        ]);

        $this->getJson("/api/reports/employee-insights?start_date=2026-03-16&end_date=2026-03-16&user_id={$employee->id}", $headers)
            ->assertOk()
            ->assertJsonPath('stats.total_duration', 180)
            ->assertJsonPath('stats.working_duration', 0)
            ->assertJsonPath('stats.idle_total_duration', 180)
            ->assertJsonPath('selected_user_tools.unproductive.0.label', 'instagram.com')
            ->assertJsonPath('selected_user_tools.unproductive.0.total_duration', 180)
            ->assertJsonPath('organization_summary.unproductive_duration', 180)
            ->assertJsonPath('employee_rankings.by_unproductive_duration.0.unproductive_duration', 180);
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

    public function test_attendance_report_marks_employee_as_working_when_live_timer_exists(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-21 10:15:00'));

        try {
            [$admin, $employee, $headers] = $this->createAdminAndEmployee();
            $this->createOpenEntryFor($employee, '2026-03-21 10:05:00');

            $query = http_build_query([
                'start_date' => '2026-03-01',
                'end_date' => '2026-03-21',
                'user_id' => $employee->id,
            ]);

            $this->getJson("/api/reports/attendance?{$query}", $headers)
                ->assertOk()
                ->assertJsonPath('data.0.user.id', $employee->id)
                ->assertJsonPath('data.0.is_working', true);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_manager_employee_insights_only_returns_employee_monitoring_rows(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-16 11:15:00'));

        try {
            $organization = Organization::create([
                'name' => 'CareVance Org',
                'slug' => 'carevance-org',
            ]);

            $manager = User::create([
                'name' => 'Manager',
                'email' => 'manager@example.com',
                'password' => Hash::make('password123'),
                'role' => 'manager',
                'organization_id' => $organization->id,
            ]);

            $employee = User::create([
                'name' => 'Employee',
                'email' => 'employee@example.com',
                'password' => Hash::make('password123'),
                'role' => 'employee',
                'organization_id' => $organization->id,
            ]);

            $anotherManager = User::create([
                'name' => 'Second Manager',
                'email' => 'second-manager@example.com',
                'password' => Hash::make('password123'),
                'role' => 'manager',
                'organization_id' => $organization->id,
            ]);

            $employeeEntry = $this->createOpenEntryFor($employee);
            $managerEntry = $this->createOpenEntryFor($anotherManager, '2026-03-16 10:50:00');

            Activity::create([
                'user_id' => $employee->id,
                'time_entry_id' => $employeeEntry->id,
                'type' => 'app',
                'name' => 'VS Code',
                'duration' => 600,
                'recorded_at' => '2026-03-16 11:00:00',
            ]);

            Activity::create([
                'user_id' => $anotherManager->id,
                'time_entry_id' => $managerEntry->id,
                'type' => 'app',
                'name' => 'Slack',
                'duration' => 600,
                'recorded_at' => '2026-03-16 11:05:00',
            ]);

            $response = $this->getJson('/api/reports/employee-insights?start_date=2026-03-16&end_date=2026-03-16', $this->apiHeadersFor($manager))
                ->assertOk();

            $this->assertCount(1, $response->json('matched_users'));
            $this->assertSame($employee->id, $response->json('matched_users.0.id'));
            $this->assertCount(1, $response->json('live_monitoring.all_users'));
            $this->assertSame($employee->id, $response->json('live_monitoring.all_users.0.user.id'));
            $this->assertSame('employee', $response->json('live_monitoring.all_users.0.user.role'));
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
