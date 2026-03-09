<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatGroup;
use App\Models\ChatGroupMember;
use App\Models\ChatGroupMessage;
use App\Models\ChatGroupTypingStatus;
use App\Models\ChatMessage;
use App\Models\ChatTypingStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller
{
    public function conversations(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json([]);
        }

        $conversations = ChatConversation::query()
            ->where('organization_id', $user->organization_id)
            ->where(function ($query) use ($user) {
                $query->where('participant_one_id', $user->id)
                    ->orWhere('participant_two_id', $user->id);
            })
            ->with(['participantOne:id,name,email,last_seen_at', 'participantTwo:id,name,email,last_seen_at'])
            ->with(['messages' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (ChatConversation $conversation) use ($user) {
                $other = $conversation->participant_one_id === $user->id
                    ? $conversation->participantTwo
                    : $conversation->participantOne;
                $lastMessage = $conversation->messages->first();

                $unreadCount = ChatMessage::where('conversation_id', $conversation->id)
                    ->whereNull('read_at')
                    ->where('sender_id', '!=', $user->id)
                    ->count();

                $otherUser = $other ? [
                    'id' => $other->id,
                    'name' => $other->name,
                    'email' => $other->email,
                    'last_seen_at' => $other->last_seen_at,
                    'is_online' => $other->last_seen_at ? $other->last_seen_at->greaterThanOrEqualTo(now()->subMinutes(2)) : false,
                ] : null;

                return [
                    'id' => $conversation->id,
                    'type' => 'direct',
                    'other_user' => $otherUser,
                    'last_message' => $lastMessage,
                    'unread_count' => $unreadCount,
                    'updated_at' => $conversation->updated_at,
                ];
            })
            ->values();

        return response()->json($conversations);
    }

    public function availableUsers(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json([]);
        }

        $users = User::query()
            ->where('organization_id', $user->organization_id)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json($users);
    }

    public function unreadSummary(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json([
                'unread_messages' => 0,
                'unread_conversations' => 0,
                'unread_senders' => 0,
            ]);
        }

        $conversationIds = ChatConversation::query()
            ->where('organization_id', $user->organization_id)
            ->where(function ($query) use ($user) {
                $query->where('participant_one_id', $user->id)
                    ->orWhere('participant_two_id', $user->id);
            })
            ->pluck('id');

        $baseUnreadQuery = ChatMessage::query()
            ->whereIn('conversation_id', $conversationIds)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id);

        $groupMemberships = ChatGroupMember::query()
            ->where('user_id', $user->id)
            ->with('group:id')
            ->get();

        $groupUnreadMessages = 0;
        $groupUnreadThreads = 0;
        $groupUnreadSenders = [];

        foreach ($groupMemberships as $membership) {
            $unreadQuery = ChatGroupMessage::query()
                ->where('group_id', $membership->group_id)
                ->where('sender_id', '!=', $user->id)
                ->when(
                    $membership->last_read_at,
                    fn ($query, $lastReadAt) => $query->where('created_at', '>', $lastReadAt)
                );

            $count = (clone $unreadQuery)->count();
            if ($count > 0) {
                $groupUnreadMessages += $count;
                $groupUnreadThreads++;
                foreach ((clone $unreadQuery)->distinct('sender_id')->pluck('sender_id') as $senderId) {
                    $groupUnreadSenders[(int) $senderId] = true;
                }
            }
        }

        $directUnreadSenders = (clone $baseUnreadQuery)->distinct('sender_id')->pluck('sender_id')->map(fn ($id) => (int) $id)->all();
        foreach ($directUnreadSenders as $senderId) {
            $groupUnreadSenders[$senderId] = true;
        }

        return response()->json([
            'unread_messages' => (clone $baseUnreadQuery)->count() + $groupUnreadMessages,
            'unread_conversations' => (clone $baseUnreadQuery)->distinct('conversation_id')->count('conversation_id') + $groupUnreadThreads,
            'unread_senders' => count($groupUnreadSenders),
        ]);
    }

    public function startConversation(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $other = User::where('organization_id', $user->organization_id)
            ->where('email', $request->email)
            ->first();
        if (!$other) {
            return response()->json(['message' => 'User not found in your organization.'], 404);
        }
        if ((int) $other->id === (int) $user->id) {
            return response()->json(['message' => 'Cannot start chat with yourself.'], 422);
        }

        [$one, $two] = $this->normalizeParticipants($user->id, $other->id);

        $conversation = ChatConversation::firstOrCreate([
            'organization_id' => $user->organization_id,
            'participant_one_id' => $one,
            'participant_two_id' => $two,
        ]);

        return response()->json([
            'id' => $conversation->id,
            'other_user' => [
                'id' => $other->id,
                'name' => $other->name,
                'email' => $other->email,
            ],
        ], 201);
    }

    public function groups(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json([]);
        }

        $groups = ChatGroup::query()
            ->where('organization_id', $user->organization_id)
            ->whereHas('members', fn ($query) => $query->where('user_id', $user->id))
            ->with([
                'creator:id,name,email',
                'members.user:id,name,email,last_seen_at',
                'messages' => fn ($query) => $query->with('sender:id,name,email')->latest()->limit(1),
            ])
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (ChatGroup $group) use ($user) {
                $membership = $group->members->firstWhere('user_id', $user->id);
                $lastMessage = $group->messages->first();

                $unreadCount = ChatGroupMessage::query()
                    ->where('group_id', $group->id)
                    ->where('sender_id', '!=', $user->id)
                    ->when(
                        $membership?->last_read_at,
                        fn ($query, $lastReadAt) => $query->where('created_at', '>', $lastReadAt)
                    )
                    ->count();

                return [
                    'id' => $group->id,
                    'type' => 'group',
                    'name' => $group->name,
                    'member_count' => $group->members->count(),
                    'members' => $group->members
                        ->map(fn (ChatGroupMember $member) => [
                            'id' => $member->user?->id,
                            'name' => $member->user?->name,
                            'email' => $member->user?->email,
                            'last_seen_at' => $member->user?->last_seen_at,
                            'is_online' => $member->user?->last_seen_at ? $member->user->last_seen_at->greaterThanOrEqualTo(now()->subMinutes(2)) : false,
                        ])
                        ->filter(fn ($member) => !empty($member['id']))
                        ->values(),
                    'last_message' => $lastMessage,
                    'unread_count' => $unreadCount,
                    'updated_at' => $group->updated_at,
                ];
            })
            ->values();

        return response()->json($groups);
    }

    public function createGroup(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer|distinct|exists:users,id',
        ]);

        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $memberIds = collect($request->input('user_ids', []))
            ->map(fn ($id) => (int) $id)
            ->push((int) $user->id)
            ->unique()
            ->values();

        $validMembers = User::query()
            ->where('organization_id', $user->organization_id)
            ->whereIn('id', $memberIds)
            ->get(['id']);

        if ($validMembers->count() !== $memberIds->count()) {
            return response()->json(['message' => 'All group members must belong to your organization.'], 422);
        }

        $group = ChatGroup::create([
            'organization_id' => $user->organization_id,
            'created_by' => $user->id,
            'name' => trim((string) $request->name),
        ]);

        foreach ($memberIds as $memberId) {
            ChatGroupMember::create([
                'group_id' => $group->id,
                'user_id' => $memberId,
                'last_read_at' => $memberId === (int) $user->id ? now() : null,
            ]);
        }

        return response()->json([
            'id' => $group->id,
            'name' => $group->name,
        ], 201);
    }

    public function messages(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = $this->findUserConversation($user?->id, $conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        $messages = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->when($request->since_id, fn ($query, $sinceId) => $query->where('id', '>', (int) $sinceId))
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    public function groupMessages(Request $request, int $groupId)
    {
        $user = $request->user();
        $group = $this->findUserGroup($user?->id, $groupId);
        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $messages = ChatGroupMessage::query()
            ->where('group_id', $group->id)
            ->when($request->since_id, fn ($query, $sinceId) => $query->where('id', '>', (int) $sinceId))
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    public function sendMessage(Request $request, int $conversationId)
    {
        $request->validate([
            'body' => 'nullable|string|max:4000',
            'attachment' => 'nullable|file|max:10240',
        ]);

        $user = $request->user();
        $conversation = $this->findUserConversation($user?->id, $conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        $body = trim((string) $request->input('body', ''));
        $attachmentPath = null;
        $attachmentName = null;
        $attachmentMime = null;
        $attachmentSize = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('chat_attachments', 'public');
            $attachmentName = $file->getClientOriginalName();
            $attachmentMime = $file->getClientMimeType();
            $attachmentSize = $file->getSize();
        }

        if ($body === '' && !$attachmentPath) {
            return response()->json(['message' => 'Message or attachment is required.'], 422);
        }

        $message = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => $body !== '' ? $body : 'Attachment',
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'attachment_mime' => $attachmentMime,
            'attachment_size' => $attachmentSize,
        ]);

        $conversation->touch();

        return response()->json($message->load('sender:id,name,email'), 201);
    }

    public function sendGroupMessage(Request $request, int $groupId)
    {
        $request->validate([
            'body' => 'nullable|string|max:4000',
            'attachment' => 'nullable|file|max:10240',
        ]);

        $user = $request->user();
        $group = $this->findUserGroup($user?->id, $groupId);
        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $body = trim((string) $request->input('body', ''));
        $attachmentPath = null;
        $attachmentName = null;
        $attachmentMime = null;
        $attachmentSize = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('chat_attachments', 'public');
            $attachmentName = $file->getClientOriginalName();
            $attachmentMime = $file->getClientMimeType();
            $attachmentSize = $file->getSize();
        }

        if ($body === '' && !$attachmentPath) {
            return response()->json(['message' => 'Message or attachment is required.'], 422);
        }

        $message = ChatGroupMessage::create([
            'group_id' => $group->id,
            'sender_id' => $user->id,
            'body' => $body !== '' ? $body : 'Attachment',
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'attachment_mime' => $attachmentMime,
            'attachment_size' => $attachmentSize,
        ]);

        $group->touch();

        return response()->json($message->load('sender:id,name,email'), 201);
    }

    public function markRead(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = $this->findUserConversation($user?->id, $conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        ChatMessage::where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }

    public function markGroupRead(Request $request, int $groupId)
    {
        $user = $request->user();
        $membership = ChatGroupMember::query()
            ->where('group_id', $groupId)
            ->where('user_id', $user?->id)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $membership->update(['last_read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }

    public function setTyping(Request $request, int $conversationId)
    {
        $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        $user = $request->user();
        $conversation = $this->findUserConversation($user?->id, $conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        if ($request->boolean('is_typing')) {
            ChatTypingStatus::updateOrCreate(
                [
                    'conversation_id' => $conversation->id,
                    'user_id' => $user->id,
                ],
                [
                    'typing_until' => now()->addSeconds(8),
                ]
            );
        } else {
            ChatTypingStatus::where('conversation_id', $conversation->id)
                ->where('user_id', $user->id)
                ->delete();
        }

        return response()->json(['message' => 'Typing status updated']);
    }

    public function setGroupTyping(Request $request, int $groupId)
    {
        $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        $user = $request->user();
        $group = $this->findUserGroup($user?->id, $groupId);
        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        if ($request->boolean('is_typing')) {
            ChatGroupTypingStatus::updateOrCreate(
                [
                    'group_id' => $group->id,
                    'user_id' => $user->id,
                ],
                [
                    'typing_until' => now()->addSeconds(8),
                ]
            );
        } else {
            ChatGroupTypingStatus::where('group_id', $group->id)
                ->where('user_id', $user->id)
                ->delete();
        }

        return response()->json(['message' => 'Typing status updated']);
    }

    public function typingStatus(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = $this->findUserConversation($user?->id, $conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found'], 404);
        }

        $typingUsers = ChatTypingStatus::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $user->id)
            ->where('typing_until', '>', now())
            ->with('user:id,name,email')
            ->get()
            ->map(fn (ChatTypingStatus $status) => [
                'id' => $status->user?->id,
                'name' => $status->user?->name,
                'email' => $status->user?->email,
            ])
            ->filter(fn ($item) => !empty($item['id']))
            ->values();

        return response()->json($typingUsers);
    }

    public function groupTypingStatus(Request $request, int $groupId)
    {
        $user = $request->user();
        $group = $this->findUserGroup($user?->id, $groupId);
        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $typingUsers = ChatGroupTypingStatus::query()
            ->where('group_id', $group->id)
            ->where('user_id', '!=', $user->id)
            ->where('typing_until', '>', now())
            ->with('user:id,name,email')
            ->get()
            ->map(fn (ChatGroupTypingStatus $status) => [
                'id' => $status->user?->id,
                'name' => $status->user?->name,
                'email' => $status->user?->email,
            ])
            ->filter(fn ($item) => !empty($item['id']))
            ->values();

        return response()->json($typingUsers);
    }

    public function attachment(Request $request, int $messageId)
    {
        $user = $request->user();
        $message = ChatMessage::with('conversation')->find($messageId);
        if (!$message || !$message->conversation) {
            return response()->json(['message' => 'Message not found'], 404);
        }

        $conversation = $this->findUserConversation($user?->id, (int) $message->conversation_id);
        if (!$conversation) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$message->attachment_path || !Storage::disk('public')->exists($message->attachment_path)) {
            return response()->json(['message' => 'Attachment not found'], 404);
        }

        $headers = [
            'Content-Type' => $message->attachment_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . ($message->attachment_name ?: 'attachment') . '"',
        ];

        return response()->file(Storage::disk('public')->path($message->attachment_path), $headers);
    }

    public function groupAttachment(Request $request, int $messageId)
    {
        $user = $request->user();
        $message = ChatGroupMessage::with('group')->find($messageId);
        if (!$message || !$message->group) {
            return response()->json(['message' => 'Message not found'], 404);
        }

        $group = $this->findUserGroup($user?->id, (int) $message->group_id);
        if (!$group) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$message->attachment_path || !Storage::disk('public')->exists($message->attachment_path)) {
            return response()->json(['message' => 'Attachment not found'], 404);
        }

        $headers = [
            'Content-Type' => $message->attachment_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . ($message->attachment_name ?: 'attachment') . '"',
        ];

        return response()->file(Storage::disk('public')->path($message->attachment_path), $headers);
    }

    private function normalizeParticipants(int $a, int $b): array
    {
        return $a < $b ? [$a, $b] : [$b, $a];
    }

    private function findUserConversation(?int $userId, int $conversationId): ?ChatConversation
    {
        if (!$userId) {
            return null;
        }

        return ChatConversation::query()
            ->where('id', $conversationId)
            ->where(function ($query) use ($userId) {
                $query->where('participant_one_id', $userId)
                    ->orWhere('participant_two_id', $userId);
            })
            ->first();
    }

    private function findUserGroup(?int $userId, int $groupId): ?ChatGroup
    {
        if (!$userId) {
            return null;
        }

        return ChatGroup::query()
            ->where('id', $groupId)
            ->whereHas('members', fn ($query) => $query->where('user_id', $userId))
            ->first();
    }
}
