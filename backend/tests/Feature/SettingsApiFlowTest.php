<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettingsApiFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_preferences_password_and_me_flow(): void
    {
        $organization = Organization::create([
            'name' => 'Settings Org',
            'slug' => 'settings-org',
        ]);

        $admin = User::create([
            'name' => 'Admin Settings',
            'email' => 'admin.settings@example.com',
            'password' => Hash::make('old-password-123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $headers = $this->apiHeadersFor($admin);

        $this->putJson('/api/settings/profile', [
            'name' => 'Admin Settings Updated',
            'email' => 'admin.settings.updated@example.com',
            'avatar' => 'https://example.com/avatar.png',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('message', 'Profile updated successfully.')
            ->assertJsonPath('user.email', 'admin.settings.updated@example.com');

        $this->putJson('/api/settings/preferences', [
            'timezone' => 'Asia/Kolkata',
            'notifications' => [
                'email' => false,
            ],
        ], $headers)
            ->assertOk()
            ->assertJsonPath('settings.timezone', 'Asia/Kolkata')
            ->assertJsonPath('settings.notifications.email', false)
            ->assertJsonPath('settings.notifications.weekly_summary', true);

        $this->putJson('/api/settings/password', [
            'current_password' => 'wrong-password',
            'new_password' => 'new-password-123',
            'new_password_confirmation' => 'new-password-123',
        ], $headers)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Current password is incorrect.');

        $this->putJson('/api/settings/password', [
            'current_password' => 'old-password-123',
            'new_password' => 'new-password-123',
            'new_password_confirmation' => 'new-password-123',
        ], $headers)
            ->assertOk()
            ->assertExactJson([]);

        $admin->refresh();
        $this->assertTrue(Hash::check('new-password-123', $admin->password));

        $this->getJson('/api/settings/me', $headers)
            ->assertOk()
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonPath('organization.id', $organization->id)
            ->assertJsonPath('can_manage_org', true);
    }

    public function test_profile_email_uniqueness_slug_collision_resolution_and_billing_snapshot(): void
    {
        $collisionOrg = Organization::create([
            'name' => 'Collision Org',
            'slug' => 'shared-slug',
        ]);

        $organization = Organization::create([
            'name' => 'Settings Workspace',
            'slug' => 'settings-workspace',
        ]);

        $admin = User::create([
            'name' => 'Workspace Admin',
            'email' => 'workspace.admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        User::create([
            'name' => 'Existing User',
            'email' => 'existing.user@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        $headers = $this->apiHeadersFor($admin);

        $this->putJson('/api/settings/profile', [
            'name' => 'Workspace Admin',
            'email' => 'existing.user@example.com',
        ], $headers)
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['email']]);

        $this->putJson('/api/settings/organization', [
            'name' => 'Renamed Settings Workspace',
            'slug' => 'shared-slug',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('organization.name', 'Renamed Settings Workspace')
            ->assertJsonPath('organization.slug', 'shared-slug-1');

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'slug' => 'shared-slug-1',
        ]);

        $this->assertDatabaseHas('organizations', [
            'id' => $collisionOrg->id,
            'slug' => 'shared-slug',
        ]);

        $this->getJson('/api/settings/billing', $headers)
            ->assertOk()
            ->assertJsonPath('plan.code', 'starter')
            ->assertJsonPath('workspace.id', $organization->id);
    }

    public function test_non_admin_cannot_change_email_from_settings_but_can_update_other_profile_fields(): void
    {
        $organization = Organization::create([
            'name' => 'Manager Settings Org',
            'slug' => 'manager-settings-org',
        ]);

        $manager = User::create([
            'name' => 'Manager Settings',
            'email' => 'manager.settings@example.com',
            'password' => Hash::make('password123'),
            'role' => 'manager',
            'organization_id' => $organization->id,
        ]);

        $headers = $this->apiHeadersFor($manager);

        $this->putJson('/api/settings/profile', [
            'name' => 'Manager Settings Updated',
            'email' => 'manager.changed@example.com',
            'avatar' => 'https://example.com/manager-avatar.png',
        ], $headers)
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Only admins can change their own email from settings.');

        $manager->refresh();

        $this->assertSame('manager.settings@example.com', $manager->email);

        $this->putJson('/api/settings/profile', [
            'name' => 'Manager Settings Updated',
            'email' => 'manager.settings@example.com',
            'avatar' => 'https://example.com/manager-avatar.png',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('user.name', 'Manager Settings Updated')
            ->assertJsonPath('user.email', 'manager.settings@example.com')
            ->assertJsonPath('user.avatar', 'https://example.com/manager-avatar.png');
    }
}
