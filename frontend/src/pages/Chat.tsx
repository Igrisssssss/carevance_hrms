import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { chatApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatConversation, ChatGroup, ChatGroupMessage, ChatMessage, ChatTypingUser } from '@/types';

type ThreadSelection =
  | { type: 'direct'; id: number }
  | { type: 'group'; id: number }
  | null;

type ChatFeedMessage = ChatMessage | ChatGroupMessage;

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; name: string; email: string; role: string }>>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadSelection>(null);
  const [messages, setMessages] = useState<ChatFeedMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatTypingUser[]>([]);
  const [startEmail, setStartEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [messageText, setMessageText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const selectedConversation = useMemo(
    () => (selectedThread?.type === 'direct' ? conversations.find((c) => c.id === selectedThread.id) || null : null),
    [conversations, selectedThread]
  );

  const selectedGroup = useMemo(
    () => (selectedThread?.type === 'group' ? groups.find((group) => group.id === selectedThread.id) || null : null),
    [groups, selectedThread]
  );

  const selectedThreadLabel = selectedThread?.type === 'group' ? 'group' : 'conversation';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  const isGroupMessage = (message: ChatFeedMessage): message is ChatGroupMessage => 'group_id' in message;

  const loadThreads = async () => {
    try {
      const [conversationResponse, groupResponse] = await Promise.all([
        chatApi.getConversations(),
        chatApi.getGroups(),
      ]);

      setConversations(conversationResponse.data || []);
      setGroups(groupResponse.data || []);
    } catch (e) {
      console.error('Failed to load chat threads', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await chatApi.getAvailableUsers();
      setAvailableUsers((response.data || []).filter((candidate) => Number(candidate.id) !== Number(user?.id)));
    } catch (e) {
      console.error('Failed to load chat users', e);
    }
  };

  const loadMessages = async (thread: ThreadSelection, sinceId?: number) => {
    if (!thread) {
      setMessages([]);
      return;
    }

    try {
      const response = thread.type === 'direct'
        ? await chatApi.getMessages(thread.id, sinceId ? { since_id: sinceId } : undefined)
        : await chatApi.getGroupMessages(thread.id, sinceId ? { since_id: sinceId } : undefined);

      const incoming = response.data || [];
      if (!sinceId) {
        setMessages(incoming);
      } else if (incoming.length > 0) {
        setMessages((prev) => [...prev, ...incoming]);
      }

      if (thread.type === 'direct') {
        await chatApi.markRead(thread.id);
        setConversations((prev) => prev.map((conversation) => (
          conversation.id === thread.id ? { ...conversation, unread_count: 0 } : conversation
        )));
      } else {
        await chatApi.markGroupRead(thread.id);
        setGroups((prev) => prev.map((group) => (
          group.id === thread.id ? { ...group, unread_count: 0 } : group
        )));
      }
    } catch (e) {
      console.error(`Failed to load ${thread.type} messages`, e);
    }
  };

  const loadTyping = async (thread: ThreadSelection) => {
    if (!thread) {
      setTypingUsers([]);
      return;
    }

    try {
      const response = thread.type === 'direct'
        ? await chatApi.getTyping(thread.id)
        : await chatApi.getGroupTyping(thread.id);
      setTypingUsers(response.data || []);
    } catch {
      setTypingUsers([]);
    }
  };

  useEffect(() => {
    loadThreads();

    const interval = setInterval(loadThreads, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadAvailableUsers();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedThread) {
      const exists = selectedThread.type === 'direct'
        ? conversations.some((conversation) => conversation.id === selectedThread.id)
        : groups.some((group) => group.id === selectedThread.id);

      if (exists) {
        return;
      }
    }

    if (conversations.length > 0) {
      setSelectedThread({ type: 'direct', id: conversations[0].id });
      return;
    }

    if (groups.length > 0) {
      setSelectedThread({ type: 'group', id: groups[0].id });
      return;
    }

    setSelectedThread(null);
  }, [conversations, groups, selectedThread]);

  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    shouldStickToBottomRef.current = true;
    setAttachmentFile(null);
    setError('');

    loadMessages(selectedThread);
    loadTyping(selectedThread);

    const interval = setInterval(() => {
      const last = messages[messages.length - 1];
      loadMessages(selectedThread, last?.id);
      loadTyping(selectedThread);
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedThread, messages.length]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages.length]);

  const handleStartConversation = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!startEmail.trim()) return;

    try {
      const response = await chatApi.startConversation(startEmail.trim());
      const created = response.data;
      setStartEmail('');
      await loadThreads();
      if (created?.id) {
        setSelectedThread({ type: 'direct', id: created.id });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not start conversation');
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!groupName.trim() || groupMemberIds.length === 0) {
      setError('Group name and at least one member are required.');
      return;
    }

    try {
      const response = await chatApi.createGroup({
        name: groupName.trim(),
        user_ids: groupMemberIds,
      });
      setGroupName('');
      setGroupMemberIds([]);
      await loadThreads();
      if (response.data?.id) {
        setSelectedThread({ type: 'group', id: response.data.id });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create group');
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedThread || (!messageText.trim() && !attachmentFile)) return;

    try {
      const response = selectedThread.type === 'direct'
        ? await chatApi.sendMessage(selectedThread.id, {
            body: messageText.trim(),
            attachment: attachmentFile,
          })
        : await chatApi.sendGroupMessage(selectedThread.id, {
            body: messageText.trim(),
            attachment: attachmentFile,
          });

      setMessageText('');
      setAttachmentFile(null);

      if (selectedThread.type === 'direct') {
        await chatApi.setTyping(selectedThread.id, false);
      } else {
        await chatApi.setGroupTyping(selectedThread.id, false);
      }

      setMessages((prev) => [...prev, response.data]);
      await loadThreads();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send message');
    }
  };

  const handleMessageChange = (value: string) => {
    setMessageText(value);
    if (!selectedThread) {
      return;
    }

    const updateTyping = selectedThread.type === 'direct'
      ? chatApi.setTyping(selectedThread.id, value.trim().length > 0)
      : chatApi.setGroupTyping(selectedThread.id, value.trim().length > 0);

    updateTyping.catch(() => {});

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      const clearTyping = selectedThread.type === 'direct'
        ? chatApi.setTyping(selectedThread.id, false)
        : chatApi.setGroupTyping(selectedThread.id, false);
      clearTyping.catch(() => {});
    }, 1800);
  };

  const openAttachment = async (message: ChatFeedMessage) => {
    try {
      const response = isGroupMessage(message)
        ? await chatApi.getGroupAttachment(message.id)
        : await chatApi.getAttachment(message.id);

      const contentType = (response.headers?.['content-type'] as string) || message.attachment_mime || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not open attachment');
    }
  };

  const toggleGroupMember = (userId: number) => {
    setGroupMemberIds((prev) => (
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    ));
  };

  const formatBytes = (size?: number | null) => {
    if (!size || size <= 0) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] bg-white border border-gray-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-3">
      <div className="border-r border-gray-200 p-4 space-y-4 min-h-0 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chat</h1>
          <p className="text-sm text-gray-500">Private chats and group rooms for your organization</p>
        </div>

        <form onSubmit={handleStartConversation} className="space-y-2 rounded-lg border border-gray-200 p-3">
          <h2 className="text-sm font-semibold text-gray-900">Start private chat</h2>
          <input
            type="email"
            value={startEmail}
            onChange={(e) => setStartEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            Start / Open Chat
          </button>
        </form>

        <form onSubmit={handleCreateGroup} className="space-y-3 rounded-lg border border-gray-200 p-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Create group chat</h2>
            <p className="text-xs text-gray-500">Pick teammates who should chat together</p>
          </div>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
            {availableUsers.length === 0 ? (
              <p className="text-xs text-gray-500">No teammates available.</p>
            ) : (
              availableUsers.map((candidate) => (
                <label key={candidate.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={groupMemberIds.includes(candidate.id)}
                    onChange={() => toggleGroupMember(candidate.id)}
                  />
                  <span>{candidate.name}</span>
                  <span className="text-xs text-gray-400">{candidate.email}</span>
                </label>
              ))
            )}
          </div>
          <button type="submit" className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">
            Create Group
          </button>
        </form>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Private chats</h2>
              <span className="text-xs text-gray-400">{conversations.length}</span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[24vh] pr-1">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500">No conversations yet.</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedThread({ type: 'direct', id: conversation.id })}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedThread?.type === 'direct' && selectedThread.id === conversation.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{conversation.other_user?.name}</p>
                    <p className="text-xs text-gray-500">{conversation.other_user?.email}</p>
                    {conversation.last_message?.body && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{conversation.last_message.body}</p>
                    )}
                    {!!conversation.unread_count && conversation.unread_count > 0 && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary-600 text-white rounded-full">
                        {conversation.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Group chats</h2>
              <span className="text-xs text-gray-400">{groups.length}</span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[24vh] pr-1">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500">No groups yet.</p>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedThread({ type: 'group', id: group.id })}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedThread?.type === 'group' && selectedThread.id === group.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 truncate">{group.name}</p>
                      <span className="text-[10px] uppercase tracking-wide text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                        Group
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{group.member_count || 0} members</p>
                    {group.last_message?.body && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{group.last_message.body}</p>
                    )}
                    {!!group.unread_count && group.unread_count > 0 && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary-600 text-white rounded-full">
                        {group.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex min-h-0 flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          {selectedConversation ? (
            <>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span>{selectedConversation.other_user?.name}</span>
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${selectedConversation.other_user?.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span className="text-xs font-normal text-gray-500">
                  {selectedConversation.other_user?.is_online ? 'Online' : 'Offline'}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {selectedConversation.other_user?.email}
                {!selectedConversation.other_user?.is_online && selectedConversation.other_user?.last_seen_at
                  ? ` • Last seen ${new Date(selectedConversation.other_user.last_seen_at).toLocaleString()}`
                  : ''}
              </p>
            </>
          ) : selectedGroup ? (
            <>
              <p className="font-semibold text-gray-900">{selectedGroup.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedGroup.member_count || selectedGroup.members?.length || 0)} members
                {selectedGroup.members?.length
                  ? ` • ${selectedGroup.members.slice(0, 4).map((member) => member.name).join(', ')}${selectedGroup.members.length > 4 ? '...' : ''}`
                  : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Select a conversation or group</p>
          )}
        </div>

        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-4 space-y-3"
        >
          {!selectedThread ? (
            <p className="text-sm text-gray-500">Choose or start a private chat, or create a group.</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            messages.map((message) => {
              const mine = Number(message.sender_id) === Number(user?.id);
              const groupMessage = isGroupMessage(message);

              return (
                <div key={`${groupMessage ? 'group' : 'direct'}-${message.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {!mine && groupMessage && (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
                        {message.sender?.name || 'Teammate'}
                      </p>
                    )}
                    <p>{message.body}</p>
                    {message.has_attachment && (
                      <button
                        onClick={() => openAttachment(message)}
                        type="button"
                        className={`mt-2 inline-flex items-center gap-1 text-xs underline ${mine ? 'text-primary-100' : 'text-primary-700'}`}
                      >
                        Open attachment
                        {message.attachment_name ? ` (${message.attachment_name}${message.attachment_size ? `, ${formatBytes(message.attachment_size)}` : ''})` : ''}
                      </button>
                    )}
                    <p className={`text-[10px] mt-1 ${mine ? 'text-primary-100' : 'text-gray-400'}`}>
                      {new Date(message.created_at).toLocaleString()}
                      {!groupMessage && mine ? ` • ${message.read_at ? 'Read' : 'Sent'}` : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {typingUsers.length > 0 && (
            <p className="text-xs text-gray-500 italic">
              {typingUsers.map((typingUser) => typingUser.name).join(', ')} typing...
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 flex gap-2">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder={selectedThread ? `Type a message to this ${selectedThreadLabel}...` : 'Select chat first'}
              disabled={!selectedThread}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                disabled={!selectedThread}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-medium"
              />
              {attachmentFile && (
                <button
                  type="button"
                  onClick={() => setAttachmentFile(null)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!selectedThread || (!messageText.trim() && !attachmentFile)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {error && <p className="px-3 pb-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
