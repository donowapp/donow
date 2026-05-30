'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToConversations, Conversation } from '@/lib/messages';

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2);
  return (
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 uppercase">
      {letters}
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, setConversations);
    return unsub;
  }, [user]);

  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Messages</h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-white py-20 shadow text-center">
            <p className="text-5xl mb-4">💬</p>
            <h2 className="text-xl font-semibold text-gray-800">No conversations yet</h2>
            <p className="mt-2 text-gray-500">
              Browse donations and message a donor to get started.
            </p>
            <Link href="/donations" className="mt-6 inline-block rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
              Browse Donations
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const otherId = conv.participantIds.find((id) => id !== user.uid) ?? '';
              const otherName = conv.participantNames[otherId] ?? 'User';
              const unread = conv.unreadCount[user.uid] ?? 0;

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 rounded-lg bg-white p-4 shadow transition hover:shadow-md"
                >
                  <Initials name={otherName} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 truncate">{otherName}</span>
                      <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-sky-600 font-medium truncate">{conv.donationTitle}</p>
                    <p className={`mt-0.5 text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>

                  {unread > 0 && (
                    <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
