'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  getConversation,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  Conversation,
} from '@/lib/messages';
import { Message } from '@/types';

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ChatPage() {
  const params = useParams();
  const convId = params.id as string;
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef<number>(0);
  const MAX_MESSAGE_LENGTH = 1000;

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  useEffect(() => {
    if (!user || !convId) return;
    getConversation(convId).then((conv) => {
      if (!conv) { router.push('/messages'); return; }
      setConversation(conv);
    });
  }, [user, convId, router]);

  useEffect(() => {
    if (!user || !convId) return;
    const unsub = subscribeToMessages(convId, setMessages);
    return unsub;
  }, [user, convId]);

  useEffect(() => {
    if (!user || !convId) return;
    markConversationRead(convId, user.uid).catch(() => {});
  }, [user, convId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !user || !conversation) return;
    if (trimmed.length > MAX_MESSAGE_LENGTH) { setError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters).`); return; }

    const now = Date.now();
    if (now - lastSendRef.current < 500) return;
    lastSendRef.current = now;

    const receiverId = conversation.participantIds.find((id) => id !== user.uid);
    if (!receiverId) return;

    setSending(true);
    setError(null);
    try {
      await sendMessage(convId, user.uid, receiverId, conversation.donationId, trimmed);
      setInput('');
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) return null;

  const otherId = conversation?.participantIds.find((id) => id !== user.uid) ?? '';
  const otherName = conversation?.participantNames[otherId] ?? 'User';

  // Group messages by date
  const grouped: { label: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.label === label) {
      last.msgs.push(msg);
    } else {
      grouped.push({ label, msgs: [msg] });
    }
  }

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3 shadow-sm">
        <Link href="/messages" className="text-teal-600 hover:text-teal-800 text-lg font-bold">
          ←
        </Link>
        <div>
          <p className="font-semibold text-gray-900">{otherName}</p>
          {conversation && (
            <Link
              href={`/donations/${conversation.donationId}`}
              className="text-xs text-teal-600 hover:underline truncate"
            >
              {conversation.donationTitle}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-10">
            No messages yet. Say hello!
          </p>
        )}

        {grouped.map(({ label, msgs }) => (
          <div key={label}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {msgs.map((msg) => {
              const isOwn = msg.senderId === user.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isOwn
                        ? 'rounded-br-sm bg-teal-600 text-white'
                        : 'rounded-bl-sm bg-white text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${isOwn ? 'text-teal-200' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        {error && (
          <p className="mb-2 text-xs text-red-500">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              style={{ maxHeight: '120px' }}
            />
            {input.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <span className={`absolute bottom-2 right-2 text-[10px] ${input.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                {input.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="flex-shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-40"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
