<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AppNotification;
use App\Models\EmployeeWorkInfo;
use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAccessAndLeaveApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_leave_request_notifies_reporting_manager_and_admin_cannot_approve_when_manager_is_assigned(): void
    {
        $organization = Organization::create(['name' => 'Org', 'slug' => 'org']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-leave-routing@org.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);
        $manager = User::create([
            'name' => 'Manager',
            'email' => 'manager-leave-routing@org.test',
            'password' => Hash::make('password123'),
            'role' => 'manager',
            'organization_id' => $organization->id,
        ]);
        $employee = User::create([
            'name' => 'Employee',
            'email' => 'employee-leave-routing@org.test',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        EmployeeWorkInfo::create([
            'organization_id' => $organization->id,
            'user_id' => $employee->id,
            'reporting_manager_id' => $manager->id,
        ]);

        $leaveDate = Carbon::tomorrow()->startOfDay();
        while ($leaveDate->isWeekend()) {
            $leaveDate->addDay();
        }

        $createResponse = $this->postJson('/api/leave-requests', [
            'start_date' => $leaveDate->toDateString(),
            'end_date' => $leaveDate->toDateString(),
            'reason' => 'Family function',
        ], $this->apiHeadersFor($employee))->assertCreated();

        $leaveId = (int) $createResponse->json('data.id');

        $this->assertDatabaseHas('app_notifications', [
            'organization_id' => $organization->id,
            'user_id' => $manager->id,
            'title' => 'Leave Request Submitted',
        ]);
        $this->assertDatabaseMissing('app_notifications', [
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'title' => 'Leave Request Submitted',
        ]);

        $this->patchJson("/api/leave-requests/{$leaveId}/approve", [], $this->apiHeadersFor($admin))
            ->assertForbidden();

        $this->patchJson("/api/leave-requests/{$leaveId}/approve", [], $this->apiHeadersFor($manager))
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $notification = AppNotification::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $employee->id)
            ->latest()
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame('Leave Request Approved', $notification->title);
    }

    public function test_manager_leave_request_notifies_admin_and_manager_cannot_self_approve(): void
    {
        $organization = Organization::create(['name' => 'Org', 'slug' => 'org']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-review-leave@org.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);
        $manager = User::create([
            'name' => 'Manager',
            'email' => 'manager-review-leave@org.test',
            'password' => Hash::make('password123'),
            'role' => 'manager',
            'organization_id' => $organization->id,
        ]);

        $leaveDate = Carbon::tomorrow()->startOfDay();
        while ($leaveDate->isWeekend()) {
            $leaveDate->addDay();
        }

        $createResponse = $this->postJson('/api/leave-requests', [
            'start_date' => $leaveDate->toDateString(),
            'end_date' => $leaveDate->toDateString(),
            'reason' => 'Manager leave',
        ], $this->apiHeadersFor($manager))->assertCreated();

        $leaveId = (int) $createResponse->json('data.id');

        $this->assertDatabaseHas('app_notifications', [
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'title' => 'Leave Request Submitted',
        ]);
        $this->assertDatabaseMissing('app_notifications', [
            'organization_id' => $organization->id,
            'user_id' => $manager->id,
            'title' => 'Leave Request Submitted',
        ]);

        $this->patchJson("/api/leave-requests/{$leaveId}/approve", [], $this->apiHeadersFor($manager))
            ->assertForbidden();

        $this->patchJson("/api/leave-requests/{$leaveId}/approve", [], $this->apiHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_leave_request_approval_marks_leave_and_updates_attendance(): void
    {
        $organization = Organization::create(['name' => 'Org', 'slug' => 'org']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@org.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);
        $employee = User::create([
            'name' => 'Employee',
            'email' => 'employee@org.test',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        $employeeHeaders = $this->apiHeadersFor($employee);
        $adminHeaders = $this->apiHeadersFor($admin);
        $leaveDate = Carbon::tomorrow()->startOfDay();
        while ($leaveDate->isWeekend()) {
            $leaveDate->addDay();
        }

        $date = $leaveDate->toDateString();

        $createResponse = $this->postJson('/api/leave-requests', [
            'start_date' => $date,
            'end_date' => $date,
            'reason' => 'Doctor appointment',
        ], $employeeHeaders)->assertCreated();

        $leaveId = (int) $createResponse->json('data.id');

        $this->patchJson("/api/leave-requests/{$leaveId}/approve", [], $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $leave = LeaveRequest::findOrFail($leaveId);
        $attendance = AttendanceRecord::where('user_id', $employee->id)
            ->whereDate('attendance_date', $date)
            ->first();

        $this->assertSame('approved', $leave->status);
        $this->assertNotNull($attendance);
        $this->assertSame('absent', $attendance->status);
    }

    public function test_employee_is_forbidden_from_admin_reports_and_org_settings_but_admin_is_allowed(): void
    {
        $organization = Organization::create(['name' => 'Org', 'slug' => 'org']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin2@org.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);
        $employee = User::create([
            'name' => 'Employee',
            'email' => 'employee2@org.test',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        $this->getJson('/api/reports/overall', $this->apiHeadersFor($employee))->assertForbidden();
        $this->putJson('/api/settings/organization', [
            'name' => 'Changed Org',
            'slug' => 'changed-org',
        ], $this->apiHeadersFor($employee))->assertForbidden();

        $this->getJson('/api/reports/overall', $this->apiHeadersFor($admin))->assertOk();
        $this->putJson('/api/settings/organization', [
            'name' => 'Changed Org',
            'slug' => 'changed-org',
        ], $this->apiHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('organization.name', 'Changed Org');
    }
}
