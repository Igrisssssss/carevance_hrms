<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\AttendanceTimeEditRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TimeEditNotificationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejecting_employee_time_edit_notifies_employee_with_rejected_status(): void
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

        $createResponse = $this->postJson('/api/attendance-time-edit-requests', [
            'attendance_date' => now()->toDateString(),
            'extra_minutes' => 60,
            'message' => 'Release support',
        ], $this->apiHeadersFor($employee))->assertCreated();

        $requestId = (int) $createResponse->json('data.id');

        $this->patchJson("/api/attendance-time-edit-requests/{$requestId}/reject", [
            'review_note' => 'Overtime could not be approved.',
        ], $this->apiHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('message', 'Time edit request rejected.');

        $notification = AppNotification::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $employee->id)
            ->latest()
            ->first();

        $this->assertNotNull($notification);
        $this->assertSame('Time Edit Request Rejected', $notification->title);
        $this->assertStringContainsString('was rejected by Admin', $notification->message);
        $this->assertStringContainsString('Overtime could not be approved.', $notification->message);
    }

    public function test_rejecting_own_time_edit_request_does_not_leave_submit_notification_as_latest(): void
    {
        $organization = Organization::create(['name' => 'Org', 'slug' => 'org']);
        $admin = User::create([
            'name' => 'Ayush',
            'email' => 'ayush@org.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $createResponse = $this->postJson('/api/attendance-time-edit-requests', [
            'attendance_date' => now()->toDateString(),
            'extra_minutes' => 60,
            'message' => 'Worked late on deployment',
        ], $this->apiHeadersFor($admin))->assertCreated();

        $requestId = (int) $createResponse->json('data.id');

        $this->assertDatabaseHas('attendance_time_edit_requests', [
            'id' => $requestId,
            'status' => 'pending',
        ]);

        $this->assertDatabaseMissing('app_notifications', [
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'title' => 'Time Edit Request Submitted',
        ]);

        $this->patchJson("/api/attendance-time-edit-requests/{$requestId}/reject", [], $this->apiHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('message', 'Time edit request rejected.');

        $notification = AppNotification::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $admin->id)
            ->latest()
            ->first();

        $request = AttendanceTimeEditRequest::findOrFail($requestId);

        $this->assertSame('rejected', $request->status);
        $this->assertNotNull($notification);
        $this->assertSame('Time Edit Request Rejected', $notification->title);
        $this->assertStringContainsString('Your time edit request for', $notification->message);
        $this->assertStringNotContainsString('submitted a time edit request', $notification->message);
    }
}
