<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Screenshot;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ScreenshotSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_screenshot_paths_are_signed_and_files_are_not_written_to_public_disk(): void
    {
        Storage::fake('screenshots');
        Storage::fake('public');

        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        $user = User::create([
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'password' => 'password123',
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        $timeEntry = TimeEntry::create([
            'user_id' => $user->id,
            'start_time' => now()->subHour(),
            'end_time' => now(),
            'duration' => 3600,
            'billable' => true,
        ]);

        $response = $this->post('/api/screenshots', [
            'time_entry_id' => $timeEntry->id,
            'image' => UploadedFile::fake()->create('capture.png', 64, 'image/png'),
        ], $this->apiHeadersFor($user));

        $response->assertCreated();

        $screenshot = Screenshot::query()->latest('id')->firstOrFail();
        $signedUrl = (string) $response->json('path');

        Storage::disk('screenshots')->assertExists($screenshot->filename);
        Storage::disk('public')->assertMissing('screenshots/'.$screenshot->filename);
        $this->assertStringContainsString('/api/screenshots/'.$screenshot->id.'/file', $signedUrl);
        $this->assertStringContainsString('signature=', $signedUrl);

        $this->get($signedUrl)->assertOk();
    }

    public function test_admin_screenshot_index_filters_by_employee_and_date_range(): void
    {
        try {
            Carbon::setTestNow(Carbon::parse('2026-03-16 09:00:00'));

            $organization = Organization::create([
                'name' => 'CareVance',
                'slug' => 'carevance',
            ]);

            $admin = User::create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => 'password123',
                'role' => 'admin',
                'organization_id' => $organization->id,
            ]);

            $employee = User::create([
                'name' => 'Employee User',
                'email' => 'employee@example.com',
                'password' => 'password123',
                'role' => 'employee',
                'organization_id' => $organization->id,
            ]);

            $anotherEmployee = User::create([
                'name' => 'Another Employee',
                'email' => 'another@example.com',
                'password' => 'password123',
                'role' => 'employee',
                'organization_id' => $organization->id,
            ]);

            $matchingEntry = TimeEntry::create([
                'user_id' => $employee->id,
                'start_time' => '2026-03-16 09:00:00',
                'end_time' => '2026-03-16 10:00:00',
                'duration' => 3600,
                'billable' => true,
            ]);

            $olderEntry = TimeEntry::create([
                'user_id' => $employee->id,
                'start_time' => '2026-03-10 09:00:00',
                'end_time' => '2026-03-10 10:00:00',
                'duration' => 3600,
                'billable' => true,
            ]);

            $otherUserEntry = TimeEntry::create([
                'user_id' => $anotherEmployee->id,
                'start_time' => '2026-03-16 09:00:00',
                'end_time' => '2026-03-16 10:00:00',
                'duration' => 3600,
                'billable' => true,
            ]);

            Carbon::setTestNow(Carbon::parse('2026-03-16 09:30:00'));
            $matchingScreenshot = Screenshot::create([
                'time_entry_id' => $matchingEntry->id,
                'filename' => 'matching.png',
            ]);

            Carbon::setTestNow(Carbon::parse('2026-03-10 09:30:00'));
            Screenshot::create([
                'time_entry_id' => $olderEntry->id,
                'filename' => 'older.png',
            ]);

            Carbon::setTestNow(Carbon::parse('2026-03-16 09:45:00'));
            Screenshot::create([
                'time_entry_id' => $otherUserEntry->id,
                'filename' => 'other-user.png',
            ]);

            $this->getJson(
                "/api/screenshots?user_id={$employee->id}&start_date=2026-03-16&end_date=2026-03-16&per_page=8",
                $this->apiHeadersFor($admin)
            )
                ->assertOk()
                ->assertJsonPath('total', 1)
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $matchingScreenshot->id)
                ->assertJsonPath('data.0.time_entry_id', $matchingEntry->id)
                ->assertJsonPath('data.0.user_id', $employee->id)
                ->assertJsonPath('data.0.user.name', $employee->name)
                ->assertJsonPath('data.0.user.email', $employee->email)
                ->assertJsonPath('data.0.user.role', $employee->role);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_admin_can_bulk_delete_selected_screenshots(): void
    {
        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $employee = User::create([
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'password' => 'password123',
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        $timeEntry = TimeEntry::create([
            'user_id' => $employee->id,
            'start_time' => '2026-03-16 09:00:00',
            'end_time' => '2026-03-16 10:00:00',
            'duration' => 3600,
            'billable' => true,
        ]);

        $first = Screenshot::create([
            'time_entry_id' => $timeEntry->id,
            'filename' => 'selected-1.png',
        ]);
        $second = Screenshot::create([
            'time_entry_id' => $timeEntry->id,
            'filename' => 'selected-2.png',
        ]);
        $remaining = Screenshot::create([
            'time_entry_id' => $timeEntry->id,
            'filename' => 'remaining.png',
        ]);

        $this->postJson('/api/screenshots/bulk-delete', [
            'screenshot_ids' => [$first->id, $second->id],
        ], $this->apiHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('deleted_count', 2);

        $this->assertDatabaseMissing('screenshots', ['id' => $first->id]);
        $this->assertDatabaseMissing('screenshots', ['id' => $second->id]);
        $this->assertDatabaseHas('screenshots', ['id' => $remaining->id]);
    }

    public function test_admin_can_bulk_delete_all_screenshots_in_employee_date_range(): void
    {
        try {
            Carbon::setTestNow(Carbon::parse('2026-03-16 09:00:00'));

            $organization = Organization::create([
                'name' => 'CareVance',
                'slug' => 'carevance',
            ]);

            $admin = User::create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => 'password123',
                'role' => 'admin',
                'organization_id' => $organization->id,
            ]);

            $employee = User::create([
                'name' => 'Employee User',
                'email' => 'employee@example.com',
                'password' => 'password123',
                'role' => 'employee',
                'organization_id' => $organization->id,
            ]);

            $anotherEmployee = User::create([
                'name' => 'Another Employee',
                'email' => 'another@example.com',
                'password' => 'password123',
                'role' => 'employee',
                'organization_id' => $organization->id,
            ]);

            $matchingEntry = TimeEntry::create([
                'user_id' => $employee->id,
                'start_time' => '2026-03-16 09:00:00',
                'end_time' => '2026-03-16 10:00:00',
                'duration' => 3600,
                'billable' => true,
            ]);

            $olderEntry = TimeEntry::create([
                'user_id' => $employee->id,
                'start_time' => '2026-03-10 09:00:00',
                'end_time' => '2026-03-10 10:00:00',
                'duration' => 3600,
                'billable' => true,
            ]);

            $otherUserEntry = TimeEntry::create([
                'user_id' => $anotherEmployee->id,
                'start_time' => '2026-03-16 09:00:00',
                'end_time' => '2026-03-16 10:00:00',
                'duration' => 3600,
                'billable' => true,
            ]);

            Carbon::setTestNow(Carbon::parse('2026-03-16 09:30:00'));
            $matchingOne = Screenshot::create([
                'time_entry_id' => $matchingEntry->id,
                'filename' => 'matching-one.png',
            ]);
            $matchingTwo = Screenshot::create([
                'time_entry_id' => $matchingEntry->id,
                'filename' => 'matching-two.png',
            ]);

            Carbon::setTestNow(Carbon::parse('2026-03-10 09:30:00'));
            $olderScreenshot = Screenshot::create([
                'time_entry_id' => $olderEntry->id,
                'filename' => 'older.png',
            ]);

            Carbon::setTestNow(Carbon::parse('2026-03-16 09:45:00'));
            $otherUserScreenshot = Screenshot::create([
                'time_entry_id' => $otherUserEntry->id,
                'filename' => 'other-user.png',
            ]);

            $this->postJson('/api/screenshots/bulk-delete', [
                'delete_all_in_range' => true,
                'user_id' => $employee->id,
                'start_date' => '2026-03-16',
                'end_date' => '2026-03-16',
            ], $this->apiHeadersFor($admin))
                ->assertOk()
                ->assertJsonPath('deleted_count', 2);

            $this->assertDatabaseMissing('screenshots', ['id' => $matchingOne->id]);
            $this->assertDatabaseMissing('screenshots', ['id' => $matchingTwo->id]);
            $this->assertDatabaseHas('screenshots', ['id' => $olderScreenshot->id]);
            $this->assertDatabaseHas('screenshots', ['id' => $otherUserScreenshot->id]);
        } finally {
            Carbon::setTestNow();
        }
    }
}
