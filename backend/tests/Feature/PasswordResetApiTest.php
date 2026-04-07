<?php

namespace Tests\Feature;

use App\Mail\PasswordResetMail;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_validate_and_complete_password_reset(): void
    {
        Mail::fake();

        $organization = Organization::create([
            'name' => 'CareVance',
            'slug' => 'carevance',
        ]);

        $user = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'owner@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a reset link has been sent.');

        Mail::assertQueued(PasswordResetMail::class);

        $token = Password::broker()->createToken($user);

        $this->getJson('/api/auth/reset-password/validate?'.http_build_query([
            'email' => $user->email,
            'token' => $token,
        ]))
            ->assertOk()
            ->assertJsonPath('valid', true);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Password reset successfully.');

        $this->assertTrue(Hash::check('new-password123', $user->fresh()->password));

        $this->getJson('/api/auth/reset-password/validate?'.http_build_query([
            'email' => $user->email,
            'token' => $token,
        ]))
            ->assertOk()
            ->assertJsonPath('valid', false);
    }

    public function test_forgot_password_endpoint_is_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/auth/forgot-password', [
                'email' => 'owner@example.com',
            ])->assertOk();
        }

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'owner@example.com',
        ])->assertStatus(429);
    }
}
