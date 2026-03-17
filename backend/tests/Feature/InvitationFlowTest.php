<?php

namespace Tests\Feature;

use App\Mail\CareVanceInvitationMail;
use App\Models\Invitation;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class InvitationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_send_invitation_email_and_invited_user_can_accept_once(): void
    {
        Mail::fake();

        [$organization, $owner] = $this->createWorkspaceOwner();

        $inviteResponse = $this->postJson('/api/invitations', [
            'emails' => ['new.employee@example.com'],
            'role' => 'employee',
            'delivery' => 'email',
        ], $this->apiHeadersFor($owner));

        $inviteResponse
            ->assertCreated()
            ->assertJsonPath('invited_count', 1)
            ->assertJsonPath('invitations.0.role', 'employee')
            ->assertJsonPath('invitations.0.mail_delivery', 'sent');

        Mail::assertQueued(CareVanceInvitationMail::class);

        $inviteUrl = (string) $inviteResponse->json('invitations.0.invite_url');
        $token = basename(parse_url($inviteUrl, PHP_URL_PATH) ?: '');

        $this->getJson("/api/invitations/{$token}")
            ->assertOk()
            ->assertJsonPath('invitation.email', 'new.employee@example.com')
            ->assertJsonPath('invitation.role', 'employee')
            ->assertJsonPath('invitation.organization.id', $organization->id)
            ->assertJsonPath('invitation.can_accept', true);

        $acceptResponse = $this->postJson("/api/invitations/{$token}/accept", [
            'name' => 'New Employee',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ]);

        $acceptResponse
            ->assertCreated()
            ->assertJsonPath('user.email', 'new.employee@example.com')
            ->assertJsonPath('user.role', 'employee')
            ->assertJsonPath('organization.id', $organization->id);

        $this->assertDatabaseHas('invitations', [
            'organization_id' => $organization->id,
            'email' => 'new.employee@example.com',
            'status' => 'accepted',
        ]);

        $this->postJson("/api/invitations/{$token}/accept", [
            'name' => 'New Employee',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422);
    }

    public function test_non_owner_admin_cannot_invite_another_admin(): void
    {
        [$organization, $owner] = $this->createWorkspaceOwner();

        $admin = User::create([
            'name' => 'Secondary Admin',
            'email' => 'secondary-admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $this->postJson('/api/invitations', [
            'emails' => ['forbidden-admin@example.com'],
            'role' => 'admin',
            'delivery' => 'link',
        ], $this->apiHeadersFor($admin))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);

        $this->postJson('/api/invitations', [
            'emails' => ['manager@example.com'],
            'role' => 'manager',
            'delivery' => 'link',
        ], $this->apiHeadersFor($admin))
            ->assertCreated()
            ->assertJsonPath('invitations.0.role', 'manager');
    }

    public function test_expired_invitation_cannot_be_accepted(): void
    {
        [$organization, $owner] = $this->createWorkspaceOwner();
        $token = Invitation::generatePublicToken();

        Invitation::create([
            'organization_id' => $organization->id,
            'email' => 'expired@example.com',
            'role' => 'employee',
            'token_hash' => Invitation::hashPublicToken($token),
            'invited_by' => $owner->id,
            'status' => 'pending',
            'delivery_method' => 'link',
            'expires_at' => now()->subHour(),
        ]);

        $this->getJson("/api/invitations/{$token}")
            ->assertOk()
            ->assertJsonPath('invitation.status', 'expired')
            ->assertJsonPath('invitation.can_accept', false);

        $this->postJson("/api/invitations/{$token}/accept", [
            'name' => 'Expired User',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422);
    }

    public function test_manager_can_only_invite_employee_role(): void
    {
        [$organization] = $this->createWorkspaceOwner();

        $manager = User::create([
            'name' => 'Manager',
            'email' => 'manager@example.com',
            'password' => Hash::make('password123'),
            'role' => 'manager',
            'organization_id' => $organization->id,
        ]);

        $this->postJson('/api/invitations', [
            'emails' => ['employee@example.com'],
            'role' => 'employee',
            'delivery' => 'link',
        ], $this->apiHeadersFor($manager))
            ->assertCreated()
            ->assertJsonPath('invitations.0.role', 'employee');

        $this->postJson('/api/invitations', [
            'emails' => ['manager-2@example.com'],
            'role' => 'manager',
            'delivery' => 'link',
        ], $this->apiHeadersFor($manager))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    }

    private function createWorkspaceOwner(): array
    {
        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
            'plan_code' => 'starter',
            'subscription_status' => 'trial',
            'subscription_intent' => 'trial',
            'trial_starts_at' => now(),
            'trial_ends_at' => now()->addDays(14),
            'subscription_expires_at' => now()->addDays(14)->toDateString(),
        ]);

        $owner = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $organization->forceFill(['owner_user_id' => $owner->id])->save();

        return [$organization->fresh(), $owner->fresh()];
    }
}
