<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
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
                    'other_user' => $otherUser,
                    'last_message' => $lastMessage,
                    'unread_count' => $unreadCount,
                    'updated_at' => $conversation->updated_at,
                ];
            })
            ->values();

        return response()->json($conversations);
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

        if ($conversationIds->isEmpty()) {
            return response()->json([
                'unread_messages' => 0,
                'unread_conversations' => 0,
                'unread_senders' => 0,
            ]);
        }

        $baseUnreadQuery = ChatMessage::query()
            ->whereIn('conversation_id', $conversationIds)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id);

        return response()->json([
            'unread_messages' => (clone $baseUnreadQuery)->count(),
            'unread_conversations' => (clone $baseUnreadQuery)->distinct('conversation_id')->count('conversation_id'),
            'unread_senders' => (clone $baseUnreadQuery)->distinct('sender_id')->count('sender_id'),
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
}
