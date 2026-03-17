<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\AppNotification;
use App\Models\AttendanceRecord;
use App\Models\AttendanceTimeEditRequest;
use App\Models\LeaveRequest;
use App\Models\Payslip;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\ReportGroup;
use App\Services\Authorization\OrganizationRoleService;
use App\Services\Audit\AuditLogService;
use App\Services\Reports\TimeBreakdownService;
use App\Services\TimeEntries\TimeEntryDurationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly TimeBreakdownService $timeBreakdownService,
        private readonly TimeEntryDurationService $timeEntryDurationService,
        private readonly OrganizationRoleService $organizationRoleService,
    )
    {
    }

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
            'role' => 'nullable|in:admin,manager,employee,client',
            'password' => 'nullable|string|min:8',
            'settings' => 'nullable|array',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'integer',
        ]);

        $selectedRole = $validated['role'] ?? 'employee';
        $this->organizationRoleService->assertCanAssignRole($currentUser, $selectedRole);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password'] ?? Str::random(12)),
            'role' => $selectedRole,
            'organization_id' => $currentUser->organization_id,
            'settings' => $validated['settings'] ?? null,
        ]);

        if (array_key_exists('group_ids', $validated)) {
            $groupIds = ReportGroup::where('organization_id', $currentUser->organization_id)
                ->whereIn('id', $validated['group_ids'] ?? [])
                ->pluck('id')
                ->all();

            $user->reportGroups()->sync($groupIds);
        }

        $this->auditLogService->log(
            action: 'user.created',
            actor: $currentUser,
            target: $user,
            metadata: [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            request: $request
        );

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

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,manager,employee,client',
            'settings' => 'nullable|array',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'integer',
        ]);

        if (array_key_exists('role', $validated)) {
            $this->organizationRoleService->assertCanAssignRole($request->user(), $validated['role']);
        }

        $originalRole = $user->role;
        $originalAttributes = $user->only(['name', 'email', 'role', 'settings']);
        $updatable = collect($validated)
            ->except(['group_ids'])
            ->all();
        $user->update($updatable);

        if (array_key_exists('group_ids', $validated)) {
            $groupIds = ReportGroup::where('organization_id', $user->organization_id)
                ->whereIn('id', $validated['group_ids'] ?? [])
                ->pluck('id')
                ->all();

            $user->reportGroups()->sync($groupIds);
        }

        $this->auditLogService->log(
            action: 'user.updated',
            actor: $request->user(),
            target: $user,
            metadata: [
                'changed_fields' => array_keys($validated),
                'before' => $originalAttributes,
                'after' => $user->only(['name', 'email', 'role', 'settings']),
            ],
            request: $request
        );

        if (array_key_exists('role', $validated) && $validated['role'] !== $originalRole) {
            $this->auditLogService->log(
                action: 'user.role_changed',
                actor: $request->user(),
                target: $user,
                metadata: [
                    'from' => $originalRole,
                    'to' => $validated['role'],
                ],
                request: $request
            );
        }

        return response()->json($user);
    }

    public function destroy(Request $request, User $user)
    {
        if (!$this->canAccessUser($request, $user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($request->user()?->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account from user management.'], 422);
        }

        $deletedUserSnapshot = $user->only(['name', 'email', 'role']);
        $this->auditLogService->log(
            action: 'user.deleted',
            actor: $request->user(),
            target: $user,
            metadata: $deletedUserSnapshot,
            request: $request
        );

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
        if (!$this->canManageUsers($currentUser) && $currentUser->id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = TimeEntry::where('user_id', $user->id);
        if ($request->start_date) {
            $query->whereDate('start_time', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->whereDate('start_time', '<=', $request->end_date);
        }

        $entries = $query->get();
        $resolvedNow = now();
        $idleQuery = Activity::where('user_id', $user->id)
            ->where('type', 'idle');
        if ($request->start_date) {
            $idleQuery->whereDate('recorded_at', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $idleQuery->whereDate('recorded_at', '<=', $request->end_date);
        }

        $timeBreakdown = $this->timeBreakdownService->build(
            $this->timeEntryDurationService->sumEffectiveDuration($entries, $resolvedNow),
            (int) $idleQuery->sum('duration')
        );

        return response()->json([
            'user_id' => $user->id,
            'entries_count' => $entries->count(),
            'total_hours' => round($timeBreakdown['total_duration'] / 3600, 2),
        ] + $timeBreakdown);
    }

    public function profile360(Request $request, int $id)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::where('organization_id', $currentUser->organization_id)->find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        if (!$this->canManageUsers($currentUser) && $currentUser->id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $startDate = $request->filled('start_date')
            ? Carbon::parse((string) $request->start_date)->startOfDay()
            : now()->startOfMonth();
        $endDate = $request->filled('end_date')
            ? Carbon::parse((string) $request->end_date)->endOfDay()
            : now()->endOfDay();
        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate->copy()->startOfDay(), $startDate->copy()->endOfDay()];
        }

        $entries = TimeEntry::with(['project:id,name', 'task:id,title'])
            ->where('user_id', $user->id)
            ->whereBetween('start_time', [$startDate, $endDate])
            ->orderByDesc('start_time')
            ->get();
        $resolvedNow = now();
        $entries->transform(function (TimeEntry $entry) use ($resolvedNow) {
            $entry->duration = $this->timeEntryDurationService->effectiveDuration($entry, $resolvedNow);

            return $entry;
        });

        $attendanceRecords = AttendanceRecord::query()
            ->where('user_id', $user->id)
            ->whereBetween('attendance_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderByDesc('attendance_date')
            ->limit(14)
            ->get();

        $leaveRequests = LeaveRequest::query()
            ->with(['reviewer:id,name,email', 'revokeReviewer:id,name,email'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $timeEditRequests = AttendanceTimeEditRequest::query()
            ->with('reviewer:id,name,email')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $payslips = Payslip::query()
            ->where('user_id', $user->id)
            ->orderByDesc('period_month')
            ->limit(6)
            ->get();

        $latestNotification = AppNotification::query()
            ->where('organization_id', $currentUser->organization_id)
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->first(['id', 'type', 'title', 'message', 'created_at', 'is_read']);

        $idleDuration = (int) Activity::query()
            ->where('user_id', $user->id)
            ->where('type', 'idle')
            ->whereBetween('recorded_at', [$startDate, $endDate])
            ->sum('duration');
        $timeBreakdown = $this->timeBreakdownService->build(
            $this->timeEntryDurationService->sumEffectiveDuration($entries, $resolvedNow),
            $idleDuration
        );
        $approvedLeaveDays = (int) $leaveRequests
            ->where('status', 'approved')
            ->sum(function (LeaveRequest $leaveRequest) {
                return Carbon::parse($leaveRequest->start_date)->diffInDays(Carbon::parse($leaveRequest->end_date)) + 1;
            });
        $approvedTimeEditsSeconds = (int) $timeEditRequests
            ->where('status', 'approved')
            ->sum('extra_seconds');

        $latestAttendance = $attendanceRecords->first();
        $activeEntry = TimeEntry::query()
            ->with('project:id,name')
            ->where('user_id', $user->id)
            ->whereNull('end_time')
            ->latest('start_time')
            ->first();

        return response()->json([
            'user' => $user,
            'range' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'summary' => [
                'entries_count' => $entries->count(),
                'attendance_days' => $attendanceRecords->count(),
                'present_days' => $attendanceRecords->where('worked_seconds', '>', 0)->count(),
                'approved_leave_days' => $approvedLeaveDays,
                'approved_time_edit_seconds' => $approvedTimeEditsSeconds,
                'payslips_count' => $payslips->count(),
            ] + $timeBreakdown,
            'status' => [
                'is_working' => (bool) $activeEntry,
                'current_project' => $activeEntry?->project?->name,
                'current_timer_started_at' => $activeEntry?->start_time,
                'last_seen_at' => $user->last_seen_at,
                'latest_attendance' => $latestAttendance,
                'latest_notification' => $latestNotification,
            ],
            'recent_time_entries' => $entries->take(8)->values(),
            'attendance_records' => $attendanceRecords,
            'leave_requests' => $leaveRequests,
            'time_edit_requests' => $timeEditRequests,
            'payslips' => $payslips,
        ]);
    }

    private function canAccessUser(Request $request, User $user): bool
    {
        $currentUser = $request->user();
        if (!$currentUser || $currentUser->organization_id !== $user->organization_id) {
            return false;
        }

        return $this->canManageUsers($currentUser) || $currentUser->id === $user->id;
    }

    private function canManageUsers(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
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
