'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/lib/notifications';
import { Notification } from '@/types';

const TYPE_ICONS: Record<Notification['type'], string> = {
  message: '💬',
  interest: '❤️',
  review: '⭐',
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || notifications.length === 0) return;
    markAllNotificationsRead(user.uid).catch(() => {});
  }, [user, notifications.length]);

  const handleClick = async (n: Notification) => {
    if (!n.isRead) markNotificationRead(n.id).catch(() => {});
    if (n.conversationId) router.push(`/messages/${n.conversationId}`);
    else if (n.donationId) router.push(`/donations/${n.donationId}`);
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Notifications</h1>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-white py-20 shadow text-center">
            <p className="text-5xl mb-4">🔔</p>
            <h2 className="text-xl font-semibold text-gray-800">No notifications yet</h2>
            <p className="mt-2 text-gray-500">
              You&apos;ll be notified when someone messages you or shows interest in your donations.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-4 rounded-lg p-4 shadow text-left transition hover:shadow-md ${
                  n.isRead ? 'bg-white' : 'bg-teal-50 border border-teal-100'
                }`}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500 truncate">{n.body}</p>
                </div>
                {!n.isRead && (
                  <span className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-teal-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
