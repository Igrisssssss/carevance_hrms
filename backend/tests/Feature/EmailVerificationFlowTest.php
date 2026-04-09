<?php

namespace Tests\Feature;

use App\Mail\VerifyEmailMail;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_verification_link_marks_user_as_verified_and_redirects_to_frontend(): void
    {
        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        $user = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->email),
            ]
        );

        $this->get($verificationUrl)
            ->assertRedirect(config('carevance.frontend_url').'/verify-email?status=verified&email=owner%40example.com');

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_authenticated_user_can_resend_verification_email(): void
    {
        Mail::fake();

        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        $user = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $this->postJson('/api/auth/email/verification-notification', [], $this->apiHeadersFor($user))
            ->assertOk()
            ->assertJsonPath('message', 'Verification email sent successfully.');

        Mail::assertQueued(VerifyEmailMail::class);
        Mail::assertQueuedCount(1);
    }

    public function test_unverified_user_cannot_log_in_until_email_is_verified(): void
    {
        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'password123',
        ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Please verify your email before signing in.')
            ->assertJsonPath('error_code', 'EMAIL_NOT_VERIFIED')
            ->assertJsonPath('email', 'owner@example.com');
    }

    public function test_verified_user_can_log_in(): void
    {
        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        $user = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();

        $this->postJson('/api/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonStructure(['token']);
    }
}
