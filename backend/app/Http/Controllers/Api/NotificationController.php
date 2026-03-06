<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\User;
use App\Services\AppNotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly AppNotificationService $notificationService)
    {
    }

    public function index(Request $request)
    {
        $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['data' => [], 'unread_count' => 0]);
        }

        $limit = (int) ($request->limit ?: 30);
        $query = AppNotification::with('sender:id,name,email')
            ->where('organization_id', $currentUser->organization_id)
            ->where('user_id', $currentUser->id)
            ->orderByDesc('created_at');

        return response()->json([
            'data' => $query->limit($limit)->get(),
            'unread_count' => (int) (clone $query)->where('is_read', false)->count(),
        ]);
    }

    public function publish(Request $request)
    {
        $request->validate([
            'type' => 'required|in:announcement,news',
            'title' => 'required|string|max:150',
            'message' => 'required|string|max:3000',
            'recipient_user_ids' => 'nullable|array',
            'recipient_user_ids.*' => 'integer',
        ]);

        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }
        if (!$this->canManage($currentUser)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $recipientIds = collect($request->recipient_user_ids ?? []);
        if ($recipientIds->isEmpty()) {
            $recipientIds = User::where('organization_id', $currentUser->organization_id)->pluck('id');
        } else {
            $recipientIds = User::where('organization_id', $currentUser->organization_id)
                ->whereIn('id', $recipientIds->map(fn ($id) => (int) $id))
                ->pluck('id');
        }

        $this->notificationService->sendToUsers(
            organizationId: (int) $currentUser->organization_id,
            userIds: $recipientIds,
            senderId: (int) $currentUser->id,
            type: (string) $request->type,
            title: (string) $request->title,
            message: (string) $request->message
        );

        return response()->json(['message' => 'Notification published.']);
    }

    public function markRead(Request $request, int $id)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        $notification = AppNotification::where('organization_id', $currentUser->organization_id)
            ->where('user_id', $currentUser->id)
            ->find($id);
        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        if (!$notification->is_read) {
            $notification->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Marked as read.']);
    }

    public function markAllRead(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->organization_id) {
            return response()->json(['message' => 'Organization is required.'], 422);
        }

        AppNotification::where('organization_id', $currentUser->organization_id)
            ->where('user_id', $currentUser->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    private function canManage(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
    }
}
