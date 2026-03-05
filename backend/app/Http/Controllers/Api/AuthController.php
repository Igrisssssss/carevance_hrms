<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'nullable|in:admin,employee',
            'organization_name' => 'nullable|string|max:255',
            'organization_id' => 'nullable|integer|exists:organizations,id',
        ]);

        $result = DB::transaction(function () use ($request) {
            $role = $request->get('role', 'admin');
            $organization = null;

            if ($role === 'employee') {
                $organization = Organization::find($request->organization_id);
                if (!$organization) {
                    throw ValidationException::withMessages([
                        'organization_id' => ['Valid organization_id is required for employee signup.'],
                    ]);
                }
            } else {
                $organizationName = trim((string) $request->organization_name);
                if ($organizationName === '') {
                    throw ValidationException::withMessages([
                        'organization_name' => ['Organization name is required for admin signup.'],
                    ]);
                }

                $baseSlug = Str::slug($organizationName);
                $slug = $baseSlug !== '' ? $baseSlug : 'organization';
                $suffix = 1;

                while (Organization::where('slug', $slug)->exists()) {
                    $slug = ($baseSlug !== '' ? $baseSlug : 'organization').'-'.$suffix;
                    $suffix++;
                }

                $organization = Organization::create([
                    'name' => $organizationName,
                    'slug' => $slug,
                ]);
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $role,
                'organization_id' => $organization->id,
            ]);

            $token = $this->issueToken($user);

            return compact('user', 'token', 'organization');
        });

        return response()->json([
            'user' => $result['user'],
            'token' => $result['token'],
            'organization' => $result['organization'],
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $this->issueToken($user);

        return response()->json([
            'user' => $user,
            'token' => $token,
            'organization' => $user->organization,
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user->load('organization');

        return response()->json($user);
    }

    public function logout(Request $request)
    {
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

        return response()->json(['message' => 'Logged out successfully']);
    }

    private function issueToken(User $user): string
    {
        $plainToken = bin2hex(random_bytes(40));

        DB::table('personal_access_tokens')->insert([
            'tokenable_type' => User::class,
            'tokenable_id' => $user->id,
            'name' => 'auth-token',
            'token' => hash('sha256', $plainToken),
            'abilities' => json_encode(['*']),
            'last_used_at' => null,
            'expires_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $plainToken;
    }
}
