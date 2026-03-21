<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AttendanceHolidayCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_holidays_and_calendar_respects_country_filter(): void
    {
        $organization = Organization::create(['name' => 'Org', 'slug' => 'org']);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
            'settings' => ['country' => 'India'],
        ]);

        $indiaEmployee = User::create([
            'name' => 'India Employee',
            'email' => 'india@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
            'settings' => ['country' => 'India'],
        ]);

        $usaEmployee = User::create([
            'name' => 'USA Employee',
            'email' => 'usa@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
            'settings' => ['country' => 'USA'],
        ]);

        $holidayDate = Carbon::now()->startOfMonth()->addDays(5)->toDateString();
        $month = Carbon::parse($holidayDate)->format('Y-m');

        $createResponse = $this->postJson('/api/attendance/holidays', [
            'holiday_date' => $holidayDate,
            'country' => 'India',
            'title' => 'Festival Leave',
            'details' => 'Office closed for regional festival.',
        ], $this->apiHeadersFor($admin));

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.country', 'INDIA')
            ->assertJsonPath('data.title', 'Festival Leave');
        $this->assertSame($holidayDate, Carbon::parse((string) $createResponse->json('data.holiday_date'))->toDateString());

        $indiaCalendarResponse = $this->getJson(
            '/api/attendance/calendar?month='.$month,
            $this->apiHeadersFor($indiaEmployee)
        )->assertOk();

        $indiaDay = collect($indiaCalendarResponse->json('days'))->firstWhere('date', $holidayDate);
        $this->assertNotNull($indiaDay);
        $this->assertSame('holiday', $indiaDay['status']);
        $this->assertTrue((bool) $indiaDay['is_holiday']);
        $this->assertSame('Festival Leave', data_get($indiaDay, 'holiday.title'));
        $this->assertSame('INDIA', data_get($indiaDay, 'holiday.country'));
        $this->assertSame(1, (int) $indiaCalendarResponse->json('summary.holiday_days'));

        $usaCalendarResponse = $this->getJson(
            '/api/attendance/calendar?month='.$month,
            $this->apiHeadersFor($usaEmployee)
        )->assertOk();

        $usaDay = collect($usaCalendarResponse->json('days'))->firstWhere('date', $holidayDate);
        $this->assertNotNull($usaDay);
        $this->assertFalse((bool) ($usaDay['is_holiday'] ?? false));
        $this->assertNotSame('holiday', $usaDay['status']);
        $this->assertSame(0, (int) $usaCalendarResponse->json('summary.holiday_days'));

        $updateResponse = $this->postJson('/api/attendance/holidays', [
            'holiday_date' => $holidayDate,
            'country' => 'India',
            'title' => 'Festival Leave Updated',
            'details' => 'Updated note',
        ], $this->apiHeadersFor($admin));

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.title', 'Festival Leave Updated')
            ->assertJsonPath('data.country', 'INDIA');

        $holidayListResponse = $this->getJson(
            '/api/attendance/holidays?month='.$month,
            $this->apiHeadersFor($admin)
        )->assertOk();

        $holidayId = data_get($holidayListResponse->json('data.0'), 'id');
        $this->assertNotNull($holidayId);
        $this->assertSame('Festival Leave Updated', data_get($holidayListResponse->json('data.0'), 'title'));

        $this->deleteJson('/api/attendance/holidays/'.$holidayId, [], $this->apiHeadersFor($admin))
            ->assertOk()
            ->assertJsonPath('message', 'Holiday deleted.');

        $indiaAfterDelete = $this->getJson(
            '/api/attendance/calendar?month='.$month,
            $this->apiHeadersFor($indiaEmployee)
        )->assertOk();

        $indiaDayAfterDelete = collect($indiaAfterDelete->json('days'))->firstWhere('date', $holidayDate);
        $this->assertNotNull($indiaDayAfterDelete);
        $this->assertFalse((bool) ($indiaDayAfterDelete['is_holiday'] ?? false));
        $this->assertSame(0, (int) $indiaAfterDelete->json('summary.holiday_days'));
    }
}
