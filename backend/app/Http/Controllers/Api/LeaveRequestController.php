<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => 'nullable|in:pending,approved,rejected',
            'user_id' => 'nullable|integer',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['data' => []]);
        }

        $query = LeaveRequest::with(['user:id,name,email,role', 'reviewer:id,name,email'])
            ->where('organization_id', $currentUser->organization_id)
            ->orderByDesc('created_at');

        if (!$this->canManage($currentUser)) {
            $query->where('user_id', $currentUser->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->user_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'data' => $query->limit(200)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string|max:2000',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date)->startOfDay();

        $overlapExists = LeaveRequest::where('organization_id', $currentUser->organization_id)
            ->where('user_id', $currentUser->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('start_date', '<=', $endDate->toDateString())
            ->whereDate('end_date', '>=', $startDate->toDateString())
            ->exists();

        if ($overlapExists) {
            return response()->json(['message' => 'An overlapping leave request already exists.'], 422);
        }

        $leave = LeaveRequest::create([
            'organization_id' => $currentUser->organization_id,
            'user_id' => $currentUser->id,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Leave request submitted.',
            'data' => $leave->load(['user:id,name,email,role', 'reviewer:id,name,email']),
        ], 201);
    }

    public function approve(Request $request, int $id)
    {
        $request->validate([
            'review_note' => 'nullable|string|max:2000',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id || !$this->canManage($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $leave = LeaveRequest::where('organization_id', $currentUser->organization_id)->find($id);
        if (!$leave) {
            return response()->json(['message' => 'Leave request not found'], 404);
        }
        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be approved.'], 422);
        }

        $leave->update([
            'status' => 'approved',
            'reviewed_by' => $currentUser->id,
            'reviewed_at' => now(),
            'review_note' => $request->review_note,
        ]);

        $this->applyApprovedLeaveToAttendance($leave);

        return response()->json([
            'message' => 'Leave request approved.',
            'data' => $leave->fresh()->load(['user:id,name,email,role', 'reviewer:id,name,email']),
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $request->validate([
            'review_note' => 'nullable|string|max:2000',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id || !$this->canManage($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $leave = LeaveRequest::where('organization_id', $currentUser->organization_id)->find($id);
        if (!$leave) {
            return response()->json(['message' => 'Leave request not found'], 404);
        }
        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be rejected.'], 422);
        }

        $leave->update([
            'status' => 'rejected',
            'reviewed_by' => $currentUser->id,
            'reviewed_at' => now(),
            'review_note' => $request->review_note,
        ]);

        return response()->json([
            'message' => 'Leave request rejected.',
            'data' => $leave->fresh()->load(['user:id,name,email,role', 'reviewer:id,name,email']),
        ]);
    }

    private function applyApprovedLeaveToAttendance(LeaveRequest $leave): void
    {
        foreach (CarbonPeriod::create($leave->start_date, $leave->end_date) as $date) {
            $dateStr = $date->toDateString();
            if ($date->isWeekend()) {
                continue;
            }

            $record = AttendanceRecord::firstOrNew([
                'user_id' => $leave->user_id,
                'attendance_date' => $dateStr,
            ]);
            $record->organization_id = $leave->organization_id;

            // Keep real worked days untouched.
            if ($record->exists && ($record->check_in_at || (int) $record->worked_seconds > 0)) {
                continue;
            }

            $record->fill([
                'check_in_at' => null,
                'check_out_at' => null,
                'worked_seconds' => 0,
                'late_minutes' => 0,
                'status' => 'absent',
            ]);
            $record->save();
        }
    }

    private function canManage(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
    }
}
