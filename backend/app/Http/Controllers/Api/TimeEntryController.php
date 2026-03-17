<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendancePunch;
use App\Models\AttendanceRecord;
use App\Models\LeaveRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Services\TimeEntries\TimeEntryDurationService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimeEntryController extends Controller
{
    public function __construct(
        private readonly TimeEntryDurationService $timeEntryDurationService,
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['data' => []]);
        }

        $targetUser = $user;
        $requestedUserId = (int) $request->get('user_id', 0);

        if ($requestedUserId > 0 && $requestedUserId !== (int) $user->id) {
            if (! $this->canViewOrganizationEntries($user)) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $targetUser = User::query()
                ->where('organization_id', $user->organization_id)
                ->find($requestedUserId);

            if (! $targetUser) {
                return response()->json(['message' => 'User not found'], 404);
            }
        }

        $timeEntries = TimeEntry::with('task', 'project')
            ->where('user_id', $targetUser->id)
            ->when($request->timer_slot, fn (Builder $q, string $slot) => $q->where('timer_slot', $slot))
            ->when($request->project_id, fn (Builder $q, string $projectId) => $q->where('project_id', $projectId))
            ->when($request->task_id, fn (Builder $q, string $taskId) => $q->where('task_id', $taskId))
            ->when($request->start_date, fn (Builder $q, string $start) => $q->whereDate('start_time', '>=', $start))
            ->when($request->end_date, fn (Builder $q, string $end) => $q->whereDate('start_time', '<=', $end))
            ->orderBy('start_time', 'desc')
            ->paginate((int) $request->get('per_page', 15));

        $resolvedNow = now();
        $timeEntries->setCollection(
            $timeEntries->getCollection()->map(function (TimeEntry $entry) use ($resolvedNow) {
                $entry->duration = $this->timeEntryDurationService->effectiveDuration($entry, $resolvedNow);

                return $entry;
            })
        );

        return response()->json($timeEntries);
    }

    public function store(Request $request)
    {
        $request->validate([
            'description' => 'nullable|string',
            'project_id' => 'nullable|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after:start_time',
            'duration' => 'nullable|integer|min:0',
            'billable' => 'nullable|boolean',
            'timer_slot' => 'nullable|in:primary,secondary',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $assignment = $this->resolveProjectAndTask($request, $user);
        if ($assignment instanceof JsonResponse) {
            return $assignment;
        }

        [$projectId, $taskId] = $assignment;

        $timeEntry = TimeEntry::create([
            'description' => $request->description,
            'project_id' => $projectId,
            'task_id' => $taskId,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'duration' => $request->duration ?? 0,
            'billable' => $request->billable ?? true,
            'user_id' => $user->id,
            'timer_slot' => $request->get('timer_slot', 'primary'),
        ]);

        $timeEntry->load('project', 'task');
        return response()->json($timeEntry, 201);
    }

    public function show(TimeEntry $timeEntry)
    {
        if (!$this->canViewTimeEntry($timeEntry)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $timeEntry->load('task', 'project');
        $timeEntry->duration = $this->timeEntryDurationService->effectiveDuration($timeEntry);

        return response()->json($timeEntry);
    }

    public function update(Request $request, TimeEntry $timeEntry)
    {
        if (!$this->canModifyTimeEntry($timeEntry)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'description' => 'nullable|string',
            'project_id' => 'nullable|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'duration' => 'nullable|integer|min:0',
            'billable' => 'nullable|boolean',
            'timer_slot' => 'nullable|in:primary,secondary',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $assignment = $this->resolveProjectAndTask($request, $user, $timeEntry);
        if ($assignment instanceof JsonResponse) {
            return $assignment;
        }

        [$projectId, $taskId] = $assignment;

        $payload = $request->only([
            'description',
            'start_time',
            'end_time',
            'duration',
            'billable',
            'timer_slot',
        ]);

        if ($request->exists('project_id') || $request->exists('task_id')) {
            $payload['project_id'] = $projectId;
            $payload['task_id'] = $taskId;
        }

        $timeEntry->update($payload);

        return response()->json($timeEntry->fresh()->load('project', 'task'));
    }

    public function destroy(TimeEntry $timeEntry)
    {
        if (!$this->canModifyTimeEntry($timeEntry)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $timeEntry->delete();

        return response()->json(['message' => 'Time entry deleted']);
    }

    public function start(Request $request)
    {
        $request->validate([
            'description' => 'nullable|string',
            'project_id' => 'nullable|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'timer_slot' => 'nullable|in:primary,secondary',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $assignment = $this->resolveProjectAndTask($request, $user);
        if ($assignment instanceof JsonResponse) {
            return $assignment;
        }

        [$projectId, $taskId] = $assignment;
        $slot = $request->get('timer_slot', 'primary');

        if ($slot === 'primary') {
            $attendanceGuard = $this->ensureAttendanceCheckedIn($user);
            if ($attendanceGuard) {
                return $attendanceGuard;
            }
        }

        $startedAt = now();
        $runningEntries = $this->runningEntriesQuery((int) $user->id, $slot)
            ->orderByDesc('start_time')
            ->get();
        $this->closeRunningEntries($runningEntries, $startedAt);

        $timeEntry = TimeEntry::create([
            'description' => $request->description,
            'project_id' => $projectId,
            'task_id' => $taskId,
            'start_time' => $startedAt,
            'user_id' => $user->id,
            'timer_slot' => $slot,
        ]);

        $timeEntry->load('project', 'task');
        return response()->json($timeEntry, 201);
    }

    public function stop(Request $request)
    {
        $request->validate([
            'timer_slot' => 'nullable|in:primary,secondary',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $slot = $request->get('timer_slot', 'primary');

        $runningEntries = $this->runningEntriesQuery((int) $user->id, $slot)
            ->orderByDesc('start_time')
            ->get();

        if ($runningEntries->isEmpty()) {
            return response()->json(['message' => 'No running timer found'], 404);
        }

        $stoppedAt = now();
        $this->closeRunningEntries($runningEntries, $stoppedAt);
        $timeEntry = $runningEntries->first();

        if ($slot === 'primary') {
            $this->ensureAttendanceCheckedOutForBreak($user->id, $stoppedAt);
        }

        return response()->json($timeEntry->load('project', 'task'));
    }

    public function active(Request $request)
    {
        $request->validate([
            'timer_slot' => 'nullable|in:primary,secondary',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(null);
        }
        $slot = $request->get('timer_slot', 'primary');

        $timeEntry = $this->runningEntriesQuery((int) $user->id, $slot)
            ->with('task', 'project')
            ->orderByDesc('start_time')
            ->first();

        if ($timeEntry) {
            $timeEntry->duration = $this->timeEntryDurationService->effectiveDuration($timeEntry);
        }

        return response()->json($timeEntry);
    }

    public function today(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'time_entries' => [],
                'total_duration' => 0,
            ]);
        }

        $today = now()->startOfDay();

        $timeEntries = TimeEntry::with('task', 'project')
            ->where('user_id', $user->id)
            ->where('start_time', '>=', $today)
            ->orderBy('start_time', 'desc')
            ->get();

        $resolvedNow = now();
        $timeEntries->transform(function (TimeEntry $entry) use ($resolvedNow) {
            $entry->duration = $this->timeEntryDurationService->effectiveDuration($entry, $resolvedNow);

            return $entry;
        });

        return response()->json([
            'time_entries' => $timeEntries,
            'total_duration' => $this->timeEntryDurationService->sumEffectiveDuration($timeEntries, $resolvedNow),
        ]);
    }

    private function canViewTimeEntry(TimeEntry $timeEntry): bool
    {
        $user = request()->user();
        if (! $user) {
            return false;
        }

        if ((int) $timeEntry->user_id === (int) $user->id) {
            return true;
        }

        if (! $this->canViewOrganizationEntries($user)) {
            return false;
        }

        return User::query()
            ->where('organization_id', $user->organization_id)
            ->whereKey($timeEntry->user_id)
            ->exists();
    }

    private function canModifyTimeEntry(TimeEntry $timeEntry): bool
    {
        $user = request()->user();

        return $user && (int) $timeEntry->user_id === (int) $user->id;
    }

    private function canViewOrganizationEntries(User $user): bool
    {
        return (bool) $user->organization_id && in_array($user->role, ['admin', 'manager'], true);
    }

    private function ensureAttendanceCheckedIn($user)
    {
        $today = now()->toDateString();
        if ($this->hasApprovedLeaveOnDate((int) $user->organization_id, (int) $user->id, $today)) {
            return response()->json(['message' => 'You are on approved leave today. Timer cannot start.'], 422);
        }

        $record = AttendanceRecord::firstOrNew([
            'user_id' => $user->id,
            'attendance_date' => $today,
        ]);
        $record->organization_id = $user->organization_id;
        $record->status = 'present';

        $now = now();
        if (!$record->check_in_at) {
            $lateThreshold = Carbon::parse($today.' '.env('ATTENDANCE_LATE_AFTER', '09:30:00'));
            $record->check_in_at = $now;
            $record->late_minutes = $this->toLateMinutes($lateThreshold->diffInMinutes($now, false));
        }
        $record->save();

        $openPunch = AttendancePunch::where('attendance_record_id', $record->id)
            ->whereNull('punch_out_at')
            ->first();

        if (!$openPunch) {
            AttendancePunch::create([
                'organization_id' => $user->organization_id,
                'user_id' => $user->id,
                'attendance_record_id' => $record->id,
                'punch_in_at' => $now,
            ]);
        }

        return null;
    }

    private function ensureAttendanceCheckedOutForBreak(int $userId, ?Carbon $checkOutAt = null): void
    {
        $today = now()->toDateString();
        $record = AttendanceRecord::where('user_id', $userId)
            ->whereDate('attendance_date', $today)
            ->first();
        if (!$record) {
            return;
        }

        $openPunch = AttendancePunch::where('attendance_record_id', $record->id)
            ->whereNull('punch_out_at')
            ->orderByDesc('punch_in_at')
            ->first();
        if (!$openPunch) {
            return;
        }

        $checkOutAt = $checkOutAt ?: now();
        $sessionWorkedSeconds = max(0, Carbon::parse($openPunch->punch_in_at)->diffInSeconds($checkOutAt));
        $openPunch->update([
            'punch_out_at' => $checkOutAt,
            'worked_seconds' => (int) $sessionWorkedSeconds,
        ]);

        $closedWorked = (int) AttendancePunch::where('attendance_record_id', $record->id)
            ->whereNotNull('punch_out_at')
            ->sum('worked_seconds');

        $record->update([
            'check_out_at' => $checkOutAt,
            'worked_seconds' => $closedWorked,
            'status' => 'present',
        ]);
    }

    private function hasApprovedLeaveOnDate(int $organizationId, int $userId, string $date): bool
    {
        return LeaveRequest::where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->exists();
    }

    private function toLateMinutes(int|float $rawMinutes): int
    {
        return (int) max(0, floor($rawMinutes));
    }

    private function runningEntriesQuery(int $userId, string $slot): Builder
    {
        return TimeEntry::query()
            ->where('user_id', $userId)
            ->whereNull('end_time')
            ->where(function (Builder $query) use ($slot) {
                if ($slot === 'primary') {
                    $query->where('timer_slot', 'primary')
                        ->orWhereNull('timer_slot');

                    return;
                }

                $query->where('timer_slot', $slot);
            });
    }

    private function closeRunningEntries(Collection $runningEntries, Carbon $endedAt): void
    {
        foreach ($runningEntries as $running) {
            $running->update([
                'end_time' => $endedAt,
                'duration' => $this->timeEntryDurationService->effectiveDuration($running, $endedAt),
            ]);
        }
    }

    private function resolveProjectAndTask(Request $request, User $user, ?TimeEntry $existingEntry = null): array|JsonResponse
    {
        $projectId = $request->exists('project_id')
            ? ($request->project_id ? (int) $request->project_id : null)
            : ($existingEntry?->project_id ? (int) $existingEntry->project_id : null);

        $taskId = $request->exists('task_id')
            ? ($request->task_id ? (int) $request->task_id : null)
            : ($existingEntry?->task_id ? (int) $existingEntry->task_id : null);

        if ($request->exists('project_id') && !$projectId) {
            $taskId = null;
        }

        if ($projectId) {
            $project = Project::query()
                ->where('organization_id', $user->organization_id)
                ->find($projectId);

            if (!$project) {
                return response()->json(['message' => 'Invalid project for your organization.'], 422);
            }
        }

        if ($taskId) {
            $taskQuery = Task::query()
                ->whereKey($taskId)
                ->whereHas('project', fn (Builder $query) => $query->where('organization_id', $user->organization_id));

            if ($projectId) {
                $taskQuery->where('project_id', $projectId);
            }

            $task = $taskQuery->first();

            if (!$task) {
                return response()->json([
                    'message' => $projectId
                        ? 'Selected task is not available in the chosen project.'
                        : 'Invalid task for your organization.',
                ], 422);
            }

            if (!$projectId) {
                $projectId = (int) $task->project_id;
            }
        }

        return [$projectId, $taskId];
    }
}
