<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SettingsController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user->load('organization');

        return response()->json([
            'user' => $user,
            'organization' => $user->organization,
            'can_manage_org' => $this->canManageOrg($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
            'avatar' => 'nullable|string|max:500',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'avatar' => $validated['avatar'] ?? null,
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update([
            'password' => $validated['new_password'],
        ]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function updatePreferences(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'timezone' => 'nullable|string|max:64',
            'notifications' => 'nullable|array',
            'notifications.email' => 'nullable|boolean',
            'notifications.weekly_summary' => 'nullable|boolean',
            'notifications.project_updates' => 'nullable|boolean',
            'notifications.task_assignments' => 'nullable|boolean',
        ]);

        $existing = is_array($user->settings) ? $user->settings : [];
        $user->settings = array_merge($existing, [
            'timezone' => $validated['timezone'] ?? ($existing['timezone'] ?? 'UTC'),
            'notifications' => array_merge(
                [
                    'email' => true,
                    'weekly_summary' => true,
                    'project_updates' => true,
                    'task_assignments' => true,
                ],
                $existing['notifications'] ?? [],
                $validated['notifications'] ?? []
            ),
        ]);
        $user->save();

        return response()->json([
            'message' => 'Preferences updated successfully.',
            'settings' => $user->settings,
        ]);
    }

    public function updateOrganization(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }
        if (!$this->canManageOrg($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $organization = $user->organization;
        if (!$organization) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255',
        ]);

        $slug = Str::slug($validated['slug']) ?: Str::slug($validated['name']);
        if (!$slug) {
            $slug = 'organization-'.$organization->id;
        }

        $baseSlug = $slug;
        $suffix = 1;
        while (
            \App\Models\Organization::where('slug', $slug)
                ->where('id', '!=', $organization->id)
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        $organization->update([
            'name' => $validated['name'],
            'slug' => $slug,
        ]);

        return response()->json([
            'message' => 'Organization updated successfully.',
            'organization' => $organization->fresh(),
        ]);
    }

    public function billing(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id || !$user->organization) {
            return response()->json(['plan' => null]);
        }

        $organization = $user->organization;

        return response()->json([
            'plan' => [
                'name' => match ($organization->subscription_status) {
                    'trial' => 'Trial',
                    'active' => 'Pro',
                    'expired' => 'Expired',
                    default => 'Basic',
                },
                'status' => $organization->subscription_status ?? 'trial',
                'renewal_date' => $organization->subscription_expires_at,
            ],
        ]);
    }

    private function canManageOrg($user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
    }
}
