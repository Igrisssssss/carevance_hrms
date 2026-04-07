<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\InteractsWithApiResponses;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Invitations\AcceptInvitationRequest;
use App\Http\Requests\Api\Invitations\StoreInvitationRequest;
use App\Models\Invitation;
use App\Models\Organization;
use App\Services\Authorization\OrganizationRoleService;
use App\Services\Invitations\InvitationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InvitationController extends Controller
{
    use InteractsWithApiResponses;

    public function __construct(
        private readonly InvitationService $invitationService,
        private readonly OrganizationRoleService $organizationRoleService,
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return $this->successResponse([
                'invitations' => [],
            ]);
        }

        if (!$this->organizationRoleService->canManageUsers($user)) {
            abort(403, 'Forbidden');
        }

        $invitations = Invitation::query()
            ->with('organization')
            ->where('organization_id', $user->organization_id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Invitation $invitation) => $this->invitationService->serialize($invitation))
            ->values();

        return $this->successResponse([
            'invitations' => $invitations,
        ]);
    }

    public function store(StoreInvitationRequest $request)
    {
        $user = $request->user();

        if (!$user || !$user->organization_id) {
            abort(422, 'Organization context is required.');
        }

        $organization = $user->organization()->firstOrFail();

        return $this->storeForOrganization($request, $organization);
    }

    public function storeLegacy(StoreInvitationRequest $request, int $organizationId)
    {
        $organization = Organization::query()->findOrFail($organizationId);

        return $this->storeForOrganization($request, $organization);
    }

    public function show(string $token)
    {
        $invitation = $this->invitationService->resolveByToken($token);

        return $this->successResponse([
            'invitation' => $this->invitationService->serialize($invitation, $token),
        ]);
    }

    public function accept(AcceptInvitationRequest $request, string $token)
    {
        $invitation = $this->invitationService->resolveByToken($token);
        $user = $this->invitationService->accept($invitation, $request->validated());
        $user->load(['organization', 'groups']);
        $verificationEmailSent = $this->sendVerificationEmailSafely($user);

        return $this->createdResponse([
            'user' => $user,
            'organization' => $user->organization,
            'requires_verification' => true,
            'email' => $user->email,
            'verification_email_sent' => $verificationEmailSent,
        ], 'Invitation accepted successfully. Please verify your email before signing in.');
    }

    private function storeForOrganization(StoreInvitationRequest $request, Organization $organization)
    {
        $user = $request->user();

        if (!$user || (int) $user->organization_id !== (int) $organization->id) {
            abort(403, 'Forbidden');
        }

        $result = $this->invitationService->createBatch($user, $organization, $request->validated());
        $createdCount = count($result['created']);

        if ($createdCount === 0) {
            $firstFailure = $result['failed'][0]['message'] ?? null;
            return response()->json([
                'success' => false,
                'message' => $firstFailure ?: 'No invitations were created.',
                'error_code' => 'VALIDATION_ERROR',
                'errors' => [
                    'emails' => collect($result['failed'])->pluck('message')->values()->all(),
                    'email' => $firstFailure ? [$firstFailure] : [],
                ],
            ], 422);
        }

        return $this->createdResponse([
            'invitations' => $result['created'],
            'failed' => $result['failed'],
            'invited_count' => $createdCount,
        ], $createdCount === 1 ? 'Invitation created successfully.' : 'Invitations created successfully.');
    }

    private function sendVerificationEmailSafely($user): bool
    {
        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (\Throwable $exception) {
            Log::warning('Verification email dispatch failed for invitation acceptance.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return false;
        }
    }
}
