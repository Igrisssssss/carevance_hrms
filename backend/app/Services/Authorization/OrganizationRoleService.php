<?php

namespace App\Services\Authorization;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class OrganizationRoleService
{
    public function isOwner(?User $user): bool
    {
        if (!$user || !$user->organization_id) {
            return false;
        }

        $organization = $user->relationLoaded('organization')
            ? $user->organization
            : $user->organization()->first();

        return (int) ($organization?->owner_user_id ?? 0) === (int) $user->id;
    }

    public function allowedAssignableRoles(?User $user): array
    {
        if (!$user || !$user->organization_id) {
            return [];
        }

        if ($this->isOwner($user)) {
            return ['admin', 'manager', 'employee', 'client'];
        }

        return match ($user->role) {
            'admin' => ['manager', 'employee', 'client'],
            'manager' => config('carevance.manager_can_invite_employees', true)
                ? ['employee']
                : [],
            default => [],
        };
    }

    public function assertCanAssignRole(User $actor, string $role, string $field = 'role'): void
    {
        if (!in_array($role, $this->allowedAssignableRoles($actor), true)) {
            throw ValidationException::withMessages([
                $field => ['You are not allowed to assign this role.'],
            ]);
        }
    }

    public function canManageUsers(?User $user): bool
    {
        return !empty($this->allowedAssignableRoles($user));
    }
}
