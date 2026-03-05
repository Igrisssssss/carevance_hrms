import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { chatApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatConversation, ChatMessage, ChatTypingUser } from '@/types';

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatTypingUser[]>([]);
  const [startEmail, setStartEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      const list = response.data || [];
      setConversations(list);
      if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0].id);
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: number, sinceId?: number) => {
    try {
      const response = await chatApi.getMessages(conversationId, sinceId ? { since_id: sinceId } : undefined);
      const incoming = response.data || [];
      if (!sinceId) {
        setMessages(incoming);
      } else if (incoming.length > 0) {
        setMessages((prev) => [...prev, ...incoming]);
      }
      await chatApi.markRead(conversationId);
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  const loadTyping = async (conversationId: number) => {
    try {
      const response = await chatApi.getTyping(conversationId);
      setTypingUsers(response.data || []);
    } catch {
      setTypingUsers([]);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    loadMessages(selectedConversationId);
    loadTyping(selectedConversationId);
    const interval = setInterval(() => {
      const last = messages[messages.length - 1];
      loadMessages(selectedConversationId, last?.id);
      loadTyping(selectedConversationId);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedConversationId, messages.length]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleStartConversation = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!startEmail.trim()) return;
    try {
      const response = await chatApi.startConversation(startEmail.trim());
      const created = response.data;
      setStartEmail('');
      await loadConversations();
      if (created?.id) {
        setSelectedConversationId(created.id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not start conversation');
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedConversationId || (!messageText.trim() && !attachmentFile)) return;
    try {
      const response = await chatApi.sendMessage(selectedConversationId, {
        body: messageText.trim(),
        attachment: attachmentFile,
      });
      setMessageText('');
      setAttachmentFile(null);
      await chatApi.setTyping(selectedConversationId, false);
      setMessages((prev) => [...prev, response.data]);
      await loadConversations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send message');
    }
  };

  const handleMessageChange = (value: string) => {
    setMessageText(value);
    if (!selectedConversationId) {
      return;
    }

    chatApi.setTyping(selectedConversationId, value.trim().length > 0).catch(() => {});
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      chatApi.setTyping(selectedConversationId, false).catch(() => {});
    }, 1800);
  };

  const openAttachment = async (message: ChatMessage) => {
    try {
      const response = await chatApi.getAttachment(message.id);
      const contentType = (response.headers?.['content-type'] as string) || message.attachment_mime || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not open attachment');
    }
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
      <div className="border-r border-gray-200 p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Private Chat</h1>
          <p className="text-sm text-gray-500">Start by entering employee/admin email</p>
        </div>
        <form onSubmit={handleStartConversation} className="space-y-2">
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
        <div className="space-y-2 overflow-auto max-h-[60vh]">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedConversationId === conversation.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
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

      <div className="lg:col-span-2 flex flex-col">
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
          ) : (
            <p className="text-sm text-gray-500">Select a conversation</p>
          )}
        </div>

        <div className="flex-1 p-4 overflow-auto bg-gray-50 space-y-3">
          {!selectedConversationId ? (
            <p className="text-sm text-gray-500">Choose or start a private chat.</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            messages.map((message) => {
              const mine = Number(message.sender_id) === Number(user?.id);
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
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
                      {mine ? ` • ${message.read_at ? 'Read' : 'Sent'}` : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {typingUsers.length > 0 && (
            <p className="text-xs text-gray-500 italic">
              {typingUsers.map((u) => u.name).join(', ')} typing...
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
              placeholder={selectedConversationId ? 'Type a message...' : 'Select conversation first'}
              disabled={!selectedConversationId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                disabled={!selectedConversationId}
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
            disabled={!selectedConversationId || (!messageText.trim() && !attachmentFile)}
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
