<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerSignupApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_signup_creates_workspace_admin_trial_and_billing_snapshot(): void
    {
        $response = $this->postJson('/api/auth/signup-owner', [
            'company_name' => 'CareVance Labs',
            'name' => 'Workspace Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan_code' => 'starter',
            'signup_mode' => 'trial',
            'billing_cycle' => 'monthly',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('organization.name', 'CareVance Labs')
            ->assertJsonPath('organization.plan_code', 'starter')
            ->assertJsonPath('organization.subscription_status', 'trial');

        $organization = Organization::query()->firstOrFail();
        $owner = User::query()->firstOrFail();

        $this->assertSame($owner->id, $organization->owner_user_id);
        $this->assertSame('trial', $organization->subscription_intent);
        $this->assertNotNull($organization->trial_starts_at);
        $this->assertNotNull($organization->trial_ends_at);

        $token = (string) $response->json('token');

        $this->getJson('/api/billing/current', [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ])
            ->assertOk()
            ->assertJsonPath('plan.code', 'starter')
            ->assertJsonPath('plan.status', 'trial')
            ->assertJsonPath('workspace.owner_user_id', $owner->id);
    }

    public function test_owner_signup_supports_paid_intent_without_public_role_selection(): void
    {
        $paidIntentResponse = $this->postJson('/api/auth/register', [
            'organization_name' => 'CareVance Growth',
            'name' => 'Paid Intent Owner',
            'email' => 'paid@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan_code' => 'growth',
            'signup_mode' => 'paid',
            'role' => 'admin',
        ]);

        $paidIntentResponse
            ->assertCreated()
            ->assertJsonPath('organization.subscription_status', 'inactive')
            ->assertJsonPath('organization.subscription_intent', 'paid');

        $employeeAttempt = $this->postJson('/api/auth/register', [
            'organization_name' => 'CareVance Growth',
            'name' => 'Employee Attempt',
            'email' => 'employee-attempt@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'employee',
        ]);

        $employeeAttempt
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    }
}
