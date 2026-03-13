<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ReportGroup;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    public function index()
    {
        $user = request()->user();
        if (!$user || !$user->organization_id) {
            return response()->json([]);
        }

        $organization = Organization::find($user->organization_id);
        return response()->json($organization ? [$organization] : []);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:organizations',
        ]);

        $baseSlug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);
        $slug = $baseSlug !== '' ? $baseSlug : 'organization';
        $suffix = 1;

        while (Organization::where('slug', $slug)->exists()) {
            $slug = ($baseSlug !== '' ? $baseSlug : 'organization').'-'.$suffix;
            $suffix++;
        }

        $organization = Organization::create([
            'name' => $request->name,
            'slug' => $slug,
        ]);

        if ($request->user()) {
            $request->user()->update(['organization_id' => $organization->id]);
        }

        return response()->json($organization, 201);
    }

    public function show(Organization $organization)
    {
        if (!$this->canAccessOrganization($organization)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($organization);
    }

    public function update(Request $request, Organization $organization)
    {
        if (!$this->canAccessOrganization($organization)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:organizations,slug,' . $organization->id,
            'settings' => 'nullable|array',
        ]);

        $organization->update($request->only(['name', 'slug', 'settings']));

        return response()->json($organization);
    }

    public function destroy(Organization $organization)
    {
        if (!$this->canAccessOrganization($organization)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $organization->delete();

        return response()->json(['message' => 'Organization deleted']);
    }

    public function members(int $id)
    {
        $organization = Organization::findOrFail($id);
        if (!$this->canAccessOrganization($organization)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(
            User::where('organization_id', $organization->id)
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function invite(Request $request, int $id)
    {
        $organization = Organization::findOrFail($id);
        if (!$this->canAccessOrganization($organization)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'email' => 'required|email',
            'name' => 'required|string|max:255',
            'role' => 'required|in:admin,manager,employee,client',
            'settings' => 'nullable|array',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'integer',
        ]);

        $existing = User::where('email', $validated['email'])->first();
        $groupIds = ReportGroup::where('organization_id', $organization->id)
            ->whereIn('id', $validated['group_ids'] ?? [])
            ->pluck('id')
            ->all();

        if ($existing) {
            $existing->update([
                'name' => $validated['name'],
                'role' => $validated['role'],
                'organization_id' => $organization->id,
                'settings' => $validated['settings'] ?? $existing->settings,
            ]);
            if (array_key_exists('group_ids', $validated)) {
                $existing->reportGroups()->sync($groupIds);
            }

            return response()->json([
                'message' => 'Existing user added to organization.',
                'user' => $existing,
            ]);
        }

        $password = Str::random(12);
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($password),
            'role' => $validated['role'],
            'organization_id' => $organization->id,
            'settings' => $validated['settings'] ?? null,
        ]);
        if (array_key_exists('group_ids', $validated)) {
            $user->reportGroups()->sync($groupIds);
        }

        return response()->json([
            'message' => 'User invited successfully.',
            'user' => $user,
            'temporary_password' => $password,
        ], 201);
    }

    private function canAccessOrganization(Organization $organization): bool
    {
        $user = request()->user();
        return $user && $user->organization_id === $organization->id;
    }
}
