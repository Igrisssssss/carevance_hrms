<?php

namespace App\Services\Approvals;

use App\Models\User;
use Illuminate\Support\Collection;

class ApprovalRoutingService
{
    /**
     * @return Collection<int, int>
     */
    public function reviewerUserIds(User $requester): Collection
    {
        if (! $requester->organization_id) {
            return collect();
        }

        return match ($requester->role) {
            'employee' => $this->employeeReviewerUserIds($requester),
            'manager' => $this->organizationRoleIds($requester, 'admin', (int) $requester->id),
            'admin' => collect(),
            default => $this->organizationRoleIds($requester, 'admin', (int) $requester->id),
        };
    }

    /**
     * @return Collection<int, int>
     */
    public function reviewableRequesterIds(User $reviewer): Collection
    {
        if (! $reviewer->organization_id || ! in_array($reviewer->role, ['admin', 'manager'], true)) {
            return collect();
        }

        return User::query()
            ->with('employeeWorkInfo')
            ->where('organization_id', $reviewer->organization_id)
            ->get(['id', 'organization_id', 'role'])
            ->filter(fn (User $candidate) => $this->canReview($reviewer, $candidate))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();
    }

    public function canReview(User $reviewer, User $requester): bool
    {
        if (
            ! $reviewer->organization_id
            || ! $requester->organization_id
            || (int) $reviewer->organization_id !== (int) $requester->organization_id
            || ! in_array($reviewer->role, ['admin', 'manager'], true)
        ) {
            return false;
        }

        if ($reviewer->role === 'admin' && (int) $reviewer->id === (int) $requester->id) {
            return true;
        }

        return $this->reviewerUserIds($requester)->contains((int) $reviewer->id);
    }

    /**
     * @return Collection<int, int>
     */
    private function employeeReviewerUserIds(User $requester): Collection
    {
        $assignedReviewer = $this->assignedReportingManager($requester);
        if ($assignedReviewer && (int) $assignedReviewer->id !== (int) $requester->id) {
            return collect([(int) $assignedReviewer->id]);
        }

        $managerIds = $this->organizationRoleIds($requester, 'manager', (int) $requester->id);
        if ($managerIds->isNotEmpty()) {
            return $managerIds;
        }

        return $this->organizationRoleIds($requester, 'admin', (int) $requester->id);
    }

    private function assignedReportingManager(User $requester): ?User
    {
        $workInfo = $requester->relationLoaded('employeeWorkInfo')
            ? $requester->employeeWorkInfo
            : $requester->employeeWorkInfo()->first();

        $reportingManagerId = (int) ($workInfo?->reporting_manager_id ?? 0);
        if ($reportingManagerId <= 0) {
            return null;
        }

        return User::query()
            ->where('organization_id', $requester->organization_id)
            ->whereKey($reportingManagerId)
            ->whereIn('role', ['manager', 'admin'])
            ->first();
    }

    /**
     * @return Collection<int, int>
     */
    private function organizationRoleIds(User $requester, string $role, int $excludeUserId): Collection
    {
        return User::query()
            ->where('organization_id', $requester->organization_id)
            ->where('role', $role)
            ->where('id', '!=', $excludeUserId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();
    }
}
