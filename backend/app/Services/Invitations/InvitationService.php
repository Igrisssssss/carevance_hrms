<?php

namespace App\Services\Invitations;

use App\Mail\CareVanceInvitationMail;
use App\Models\Invitation;
use App\Models\Organization;
use App\Models\ReportGroup;
use App\Models\User;
use App\Services\Authorization\OrganizationRoleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InvitationService
{
    public function __construct(
        private readonly OrganizationRoleService $organizationRoleService,
        private readonly InvitationUrlService $invitationUrlService,
    ) {
    }

    public function createBatch(User $actor, Organization $organization, array $payload): array
    {
        $this->organizationRoleService->assertCanAssignRole($actor, $payload['role']);

        $emails = collect($payload['emails'] ?? [])
            ->push($payload['email'] ?? null)
            ->filter(fn ($email) => filled($email))
            ->map(fn ($email) => mb_strtolower(trim((string) $email)))
            ->unique()
            ->values();

        $created = [];
        $failed = [];

        foreach ($emails as $email) {
            $failure = $this->validateRecipient($actor, $organization, $email);

            if ($failure !== null) {
                $failed[] = [
                    'email' => $email,
                    'message' => $failure,
                ];
                continue;
            }

            $created[] = $this->createSingle($actor, $organization, $email, $payload);
        }

        return [
            'created' => $created,
            'failed' => $failed,
        ];
    }

    public function resolveByToken(string $token): Invitation
    {
        $invitation = Invitation::query()
            ->with(['organization', 'inviter'])
            ->where('token_hash', Invitation::hashPublicToken($token))
            ->firstOrFail();

        $invitation->markExpiredIfNeeded();

        return $invitation->fresh(['organization', 'inviter']);
    }

    public function serialize(Invitation $invitation, ?string $publicToken = null): array
    {
        $invitation->markExpiredIfNeeded();

        $inviteUrl = $publicToken
            ? $this->invitationUrlService->acceptUrl($publicToken)
            : null;

        return [
            'id' => $invitation->id,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'status' => $invitation->status,
            'delivery_method' => $invitation->delivery_method,
            'email_sent_at' => $invitation->email_sent_at?->toIso8601String(),
            'expires_at' => $invitation->expires_at?->toIso8601String(),
            'accepted_at' => $invitation->accepted_at?->toIso8601String(),
            'invite_url' => $inviteUrl,
            'organization' => [
                'id' => $invitation->organization?->id,
                'name' => $invitation->organization?->name,
                'slug' => $invitation->organization?->slug,
            ],
            'metadata' => $invitation->metadata ?? [],
            'can_accept' => $invitation->status === 'pending',
        ];
    }

    public function accept(Invitation $invitation, array $payload): User
    {
        $invitation->markExpiredIfNeeded();

        if ($invitation->status !== 'pending') {
            throw new HttpException(422, 'This invitation is no longer available.');
        }

        $existing = User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($invitation->email)])
            ->first();

        if ($existing) {
            throw new HttpException(422, 'An account with this email already exists.');
        }

        return DB::transaction(function () use ($invitation, $payload) {
            $user = User::create([
                'name' => $payload['name'],
                'email' => $invitation->email,
                'password' => $payload['password'],
                'role' => $invitation->role,
                'organization_id' => $invitation->organization_id,
                'invited_by' => $invitation->invited_by,
                'settings' => $invitation->settings,
            ]);

            $groupIds = collect($invitation->metadata['group_ids'] ?? [])
                ->map(fn ($value) => (int) $value)
                ->filter()
                ->values()
                ->all();

            if (!empty($groupIds)) {
                $allowedGroupIds = ReportGroup::query()
                    ->where('organization_id', $invitation->organization_id)
                    ->whereIn('id', $groupIds)
                    ->pluck('id')
                    ->all();

                $user->reportGroups()->sync($allowedGroupIds);
            }

            $invitation->forceFill([
                'status' => 'accepted',
                'accepted_at' => now(),
                'accepted_by_user_id' => $user->id,
            ])->save();

            return $user;
        });
    }

    private function createSingle(User $actor, Organization $organization, string $email, array $payload): array
    {
        $token = Invitation::generatePublicToken();
        $expiresAt = now()->addHours((int) ($payload['expires_in_hours'] ?? config('carevance.invitation_expiration_hours', 72)));

        $invitation = DB::transaction(function () use ($actor, $organization, $email, $payload, $token, $expiresAt) {
            Invitation::query()
                ->where('organization_id', $organization->id)
                ->whereRaw('LOWER(email) = ?', [$email])
                ->where('status', 'pending')
                ->update(['status' => 'revoked']);

            return Invitation::create([
                'organization_id' => $organization->id,
                'email' => $email,
                'role' => $payload['role'],
                'token_hash' => Invitation::hashPublicToken($token),
                'invited_by' => $actor->id,
                'status' => 'pending',
                'settings' => $payload['settings'] ?? null,
                'metadata' => [
                    'group_ids' => $payload['group_ids'] ?? [],
                    'project_ids' => $payload['project_ids'] ?? [],
                ],
                'delivery_method' => $payload['delivery'] ?? 'email',
                'expires_at' => $expiresAt,
            ]);
        });

        $mailDelivery = 'not_requested';
        if (($payload['delivery'] ?? 'email') === 'email') {
            $mailDelivery = $this->sendInvitationMail($invitation, $token) ? 'sent' : 'failed';
        }

        $invitation->load('organization');

        return [
            ...$this->serialize($invitation, $token),
            'mail_delivery' => $mailDelivery,
        ];
    }

    private function validateRecipient(User $actor, Organization $organization, string $email): ?string
    {
        if (mb_strtolower($actor->email) === $email) {
            return 'This email already belongs to your account.';
        }

        $existingUser = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (!$existingUser) {
            return null;
        }

        if ((int) $existingUser->organization_id === (int) $organization->id) {
            return 'This email already exists in your workspace.';
        }

        return 'This email is already in use by another workspace.';
    }

    private function sendInvitationMail(Invitation $invitation, string $token): bool
    {
        try {
            Mail::to($invitation->email)->queue(
                new CareVanceInvitationMail(
                    invitation: $invitation->fresh(['organization', 'inviter']),
                    acceptUrl: $this->invitationUrlService->acceptUrl($token),
                )
            );

            $invitation->forceFill(['email_sent_at' => now()])->save();

            return true;
        } catch (\Throwable $exception) {
            Log::warning('Invitation email dispatch failed.', [
                'invitation_id' => $invitation->id,
                'organization_id' => $invitation->organization_id,
                'email' => $invitation->email,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return false;
        }
    }
}
