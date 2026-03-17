<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationInviteProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_inviting_the_current_admin_email_is_rejected_without_changing_the_account(): void
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

        $response = $this->postJson(
            "/api/organizations/{$organization->id}/invite",
            [
                'email' => 'admin@example.com',
                'name' => 'Accidental Employee',
                'role' => 'employee',
            ],
            $this->apiHeadersFor($admin)
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $admin->refresh();

        $this->assertSame('Admin User', $admin->name);
        $this->assertSame('admin', $admin->role);
        $this->assertSame($organization->id, $admin->organization_id);
        $this->assertSame(1, User::count());
    }

    public function test_inviting_an_existing_member_email_is_rejected_without_overwriting_that_user(): void
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

        $response = $this->postJson(
            "/api/organizations/{$organization->id}/invite",
            [
                'email' => 'employee@example.com',
                'name' => 'Promoted By Accident',
                'role' => 'manager',
            ],
            $this->apiHeadersFor($admin)
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $employee->refresh();

        $this->assertSame('Employee User', $employee->name);
        $this->assertSame('employee', $employee->role);
        $this->assertSame($organization->id, $employee->organization_id);
        $this->assertSame(2, User::count());
    }
}
