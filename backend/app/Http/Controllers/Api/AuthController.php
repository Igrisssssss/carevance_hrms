<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\InteractsWithApiResponses;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Requests\Api\Auth\SignupOwnerRequest;
use App\Models\Organization;
use App\Models\User;
use App\Services\Auth\ApiTokenService;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use InteractsWithApiResponses;

    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly ApiTokenService $apiTokenService,
    )
    {
    }

    public function register(SignupOwnerRequest $request)
    {
        return $this->signupOwner($request);
    }

    public function signupOwner(SignupOwnerRequest $request)
    {
        $validated = $request->validated();
        $organizationName = trim((string) ($validated['company_name'] ?? $validated['organization_name'] ?? ''));
        $planCode = (string) ($validated['plan_code'] ?? config('carevance.default_plan', 'starter'));
        $signupMode = (string) ($validated['signup_mode'] ?? 'trial');
        $billingCycle = $validated['billing_cycle'] ?? config('carevance.default_billing_cycle', 'monthly');
        $trialDays = max(1, (int) config('carevance.trial_days', 14));

        $result = DB::transaction(function () use ($validated, $organizationName, $planCode, $signupMode, $billingCycle, $trialDays, $request) {
            $organization = Organization::create([
                'name' => $organizationName,
                'slug' => $this->generateUniqueOrganizationSlug($organizationName),
                'plan_code' => $planCode,
                'billing_cycle' => $billingCycle,
                'subscription_status' => $signupMode === 'paid' ? 'inactive' : 'trial',
                'subscription_intent' => $signupMode === 'paid' ? 'paid' : 'trial',
                'trial_starts_at' => $signupMode === 'trial' ? now() : null,
                'trial_ends_at' => $signupMode === 'trial' ? now()->addDays($trialDays) : null,
                'subscription_expires_at' => $signupMode === 'trial' ? now()->addDays($trialDays)->toDateString() : null,
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'admin',
                'organization_id' => $organization->id,
            ]);

            $organization->forceFill([
                'owner_user_id' => $user->id,
            ])->save();

            $token = $this->apiTokenService->issue($user);

            $this->auditLogService->log(
                action: 'auth.owner_signup',
                actor: $user,
                target: $organization,
                metadata: [
                    'plan_code' => $organization->plan_code,
                    'subscription_status' => $organization->subscription_status,
                    'signup_mode' => $signupMode,
                ],
                request: $request
            );

            return compact('user', 'token', 'organization');
        });

        return $this->createdResponse([
            'user' => $result['user'],
            'token' => $result['token'],
            'organization' => $result['organization'],
        ], 'Registered successfully.');
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $this->apiTokenService->issue($user);

        $this->auditLogService->log(
            action: 'auth.login',
            actor: $user,
            target: $user,
            metadata: [
                'role' => $user->role,
            ],
            request: $request
        );

        return $this->successResponse([
            'user' => $user,
            'token' => $token,
            'organization' => $user->organization,
        ], 'Logged in successfully.');
    }

    public function user(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        $user->load('organization');

        return $this->successResponse($user->toArray());
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $tokenRecord = $request->attributes->get('access_token');

        if ($tokenRecord && isset($tokenRecord->id)) {
            DB::table('personal_access_tokens')->where('id', $tokenRecord->id)->delete();
        } else {
            $header = (string) $request->header('Authorization', '');
            if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
                $plainToken = trim($matches[1]);
                if ($plainToken !== '') {
                    DB::table('personal_access_tokens')
                        ->where('token', hash('sha256', $plainToken))
                        ->delete();
                }
            }
        }

        if ($user) {
            $this->auditLogService->log(
                action: 'auth.logout',
                actor: $user,
                target: $user,
                metadata: [
                    'token_id' => $tokenRecord->id ?? null,
                ],
                request: $request
            );
        }

        return $this->successResponse([], 'Logged out successfully');
    }

    public function handoff(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        $token = $this->apiTokenService->issue($user, 'web-handoff-token');
        $user->load('organization');

        return $this->successResponse([
            'user' => $user,
            'token' => $token,
            'organization' => $user->organization,
        ], 'Handoff token issued.');
    }

    private function generateUniqueOrganizationSlug(string $organizationName): string
    {
        $baseSlug = Str::slug($organizationName);
        $slug = $baseSlug !== '' ? $baseSlug : 'organization';
        $suffix = 1;

        while (Organization::where('slug', $slug)->exists()) {
            $slug = ($baseSlug !== '' ? $baseSlug : 'organization').'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
