<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'period' => 'nullable|in:today,week,all',
            'timezone' => 'nullable|string|max:64',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'country' => 'nullable|string|max:64',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json([]);
        }

        $period = $request->get('period', 'all');
        $timezone = (string) $request->get('timezone', 'UTC');
        if (!in_array($timezone, timezone_identifiers_list(), true)) {
            $timezone = 'UTC';
        }
        $range = $this->resolvePeriodRange(
            $period,
            $timezone,
            $request->get('start_date'),
            $request->get('end_date')
        );

        $users = User::where('organization_id', $currentUser->organization_id)
            ->when(!in_array($currentUser->role, ['admin', 'manager'], true), fn ($query) => $query->where('id', $currentUser->id))
            ->orderBy('created_at', 'desc')
            ->get();

        $activeEntries = TimeEntry::with('project')
            ->whereIn('user_id', $users->pluck('id'))
            ->whereNull('end_time')
            ->get()
            ->keyBy('user_id');

        $totalsQuery = TimeEntry::whereIn('user_id', $users->pluck('id'));
        if ($range) {
            $totalsQuery->whereBetween('start_time', [$range['start'], $range['end']]);
        }

        $totalsByUser = $totalsQuery
            ->selectRaw('user_id, COALESCE(SUM(duration), 0) as total_duration')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $payload = $users->map(function (User $user) use ($activeEntries, $totalsByUser, $timezone) {
            $activeEntry = $activeEntries->get($user->id);
            $isWorking = (bool) $activeEntry;
            $currentDuration = 0;
            $storedTotalDuration = (int) ($totalsByUser->get($user->id)->total_duration ?? 0);

            if ($activeEntry) {
                $currentDuration = max(
                    0,
                    now()->getTimestamp() - Carbon::parse($activeEntry->start_time)->getTimestamp()
                );
            }

            return array_merge($user->toArray(), [
                'is_working' => $isWorking,
                'current_duration' => (int) $currentDuration,
                'current_project' => $activeEntry?->project?->name,
                'total_duration' => $storedTotalDuration,
                'total_elapsed_duration' => $storedTotalDuration + (int) $currentDuration,
                'timezone' => $timezone,
            ]);
        });

        return response()->json($payload);
    }

    public function store(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'role' => 'nullable|in:admin,manager,employee',
            'password' => 'nullable|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password'] ?? Str::random(12)),
            'role' => $validated['role'] ?? 'employee',
            'organization_id' => $currentUser->organization_id,
        ]);

        return response()->json($user, 201);
    }

    public function show(Request $request, User $user)
    {
        if (!$this->canAccessUser($request, $user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        if (!$this->canAccessUser($request, $user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,manager,employee',
        ]);

        $user->update($request->only(['name', 'email', 'role']));

        return response()->json($user);
    }

    public function destroy(Request $request, User $user)
    {
        if (!$this->canAccessUser($request, $user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }

    public function stats(Request $request, int $id)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::where('organization_id', $currentUser->organization_id)->find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $query = TimeEntry::where('user_id', $user->id);
        if ($request->start_date) {
            $query->whereDate('start_time', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->whereDate('start_time', '<=', $request->end_date);
        }

        $entries = $query->get();

        return response()->json([
            'user_id' => $user->id,
            'entries_count' => $entries->count(),
            'total_duration' => (int) $entries->sum('duration'),
            'billable_duration' => (int) $entries->where('billable', true)->sum('duration'),
            'total_hours' => round($entries->sum('duration') / 3600, 2),
            'billable_hours' => round($entries->where('billable', true)->sum('duration') / 3600, 2),
        ]);
    }

    private function canAccessUser(Request $request, User $user): bool
    {
        $currentUser = $request->user();
        return $currentUser && $currentUser->organization_id === $user->organization_id;
    }

    private function resolvePeriodRange(string $period, string $timezone, ?string $startDate = null, ?string $endDate = null): ?array
    {
        if ($startDate || $endDate) {
            $start = $startDate
                ? Carbon::parse($startDate, $timezone)->startOfDay()
                : now($timezone)->startOfDay();
            $end = $endDate
                ? Carbon::parse($endDate, $timezone)->endOfDay()
                : now($timezone)->endOfDay();

            if ($start->greaterThan($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }

            return [
                'start' => $start->clone()->utc(),
                'end' => $end->clone()->utc(),
            ];
        }

        $now = now($timezone);

        return match ($period) {
            'today' => [
                'start' => $now->copy()->startOfDay()->utc(),
                'end' => $now->copy()->endOfDay()->utc(),
            ],
            'week' => [
                'start' => $now->copy()->startOfWeek()->utc(),
                'end' => $now->copy()->endOfWeek()->utc(),
            ],
            default => null,
        };
    }
}
