'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToConversations } from '@/lib/messages';
import { subscribeToNotifications } from '@/lib/notifications';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) { setTotalUnread(0); return; }
    const unsub = subscribeToConversations(user.uid, (convs) => {
      setTotalUnread(convs.reduce((sum, c) => sum + (c.unreadCount[user.uid] ?? 0), 0));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) { setUnreadNotifications(0); return; }
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setUnreadNotifications(notifs.filter((n) => !n.isRead).length);
    });
    return unsub;
  }, [user]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLink = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`transition-colors ${active ? 'text-white font-bold underline underline-offset-4' : 'text-teal-100 hover:text-white'}`}
      >
        {label}
      </Link>
    );
  };

  const messagesLabel = (
    <span className="relative inline-flex items-center">
      Messages
      {totalUnread > 0 && (
        <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {totalUnread > 9 ? '9+' : totalUnread}
        </span>
      )}
    </span>
  );

  const notificationsLabel = (
    <span className="relative inline-flex items-center">
      🔔
      {unreadNotifications > 0 && (
        <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )}
    </span>
  );

  return (
    <nav className="bg-teal-600 text-white shadow">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="group">
            <span className="text-xl font-extrabold tracking-tight group-hover:text-teal-100">Donow</span>
            <span className="ml-2 hidden text-xs text-teal-200 sm:inline">Donate. Help. Make Impact.</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-5 text-sm font-medium md:flex">
            {navLink('/donations', 'Browse')}

            {user && (
              <>
                {navLink('/my-donations', 'My Donations')}
                {navLink('/saved', 'Saved')}
                <Link
                  href="/messages"
                  className={`transition-colors ${pathname.startsWith('/messages') ? 'text-white font-bold underline underline-offset-4' : 'text-teal-100 hover:text-white'}`}
                >
                  {messagesLabel}
                </Link>
                <Link
                  href="/notifications"
                  className={`transition-colors ${pathname === '/notifications' ? 'text-white font-bold underline underline-offset-4' : 'text-teal-100 hover:text-white'}`}
                >
                  {notificationsLabel}
                </Link>
              </>
            )}

            <Link
              href="/create-donation"
              className="rounded-lg bg-white px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              + Donate
            </Link>

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`rounded px-2 py-1 text-xs font-bold transition ${pathname === '/admin' ? 'bg-white text-teal-700' : 'bg-teal-700 text-teal-100 hover:bg-teal-800'}`}
              >
                Admin
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-teal-100 hover:text-white transition-colors"
                >
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover border-2 border-teal-300"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className={pathname === '/dashboard' || pathname === '/profile' ? 'font-bold text-white underline underline-offset-4' : ''}>
                    {user.name.split(' ')[0]}
                  </span>
                </Link>
                <button onClick={handleLogout} className="text-xs text-teal-200 underline hover:text-white">
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-teal-300 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex items-center justify-center rounded p-1 text-white hover:bg-teal-700 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mt-3 flex flex-col gap-3 border-t border-teal-500 pt-3 text-sm font-medium">
            <Link href="/donations" className={pathname === '/donations' ? 'text-white font-bold' : 'text-teal-100'}>
              Browse
            </Link>

            {user && (
              <>
                <Link href="/my-donations" className={pathname === '/my-donations' ? 'text-white font-bold' : 'text-teal-100'}>
                  My Donations
                </Link>
                <Link href="/saved" className={pathname === '/saved' ? 'text-white font-bold' : 'text-teal-100'}>
                  Saved
                </Link>
                <Link href="/messages" className={`flex items-center gap-1 ${pathname.startsWith('/messages') ? 'text-white font-bold' : 'text-teal-100'}`}>
                  Messages
                  {totalUnread > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {totalUnread}
                    </span>
                  )}
                </Link>
                <Link href="/notifications" className={`flex items-center gap-1 ${pathname === '/notifications' ? 'text-white font-bold' : 'text-teal-100'}`}>
                  Notifications
                  {unreadNotifications > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard" className={pathname === '/dashboard' ? 'text-white font-bold' : 'text-teal-100'}>
                  {user.name.split(' ')[0]} (Dashboard)
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" className={pathname === '/admin' ? 'text-white font-bold' : 'text-teal-100'}>
                    Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout} className="text-left text-teal-200 hover:text-white">
                  Logout
                </button>
              </>
            )}

            {!user && (
              <Link href="/login" className="text-teal-100">Login</Link>
            )}

            <Link
              href="/create-donation"
              className="mt-1 rounded-lg bg-white px-3 py-2 text-center font-semibold text-teal-700"
            >
              + Donate
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
