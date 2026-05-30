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
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (convs) => {
      setTotalUnread(convs.reduce((sum, c) => sum + (c.unreadCount[user.uid] ?? 0), 0));
    });
    return () => { unsub(); setTotalUnread(0); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setUnreadNotifications(notifs.filter((n) => !n.isRead).length);
    });
    return () => { unsub(); setUnreadNotifications(0); };
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <nav className="bg-teal-700 text-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="group flex flex-col leading-tight">
            <span className="text-3xl font-extrabold tracking-tight group-hover:text-teal-100">Donow</span>
            <span className="text-[11px] font-medium text-teal-200 tracking-wide">Donate · Help · Make Impact</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-3 text-sm font-medium md:flex">
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

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${pathname === '/admin' ? 'bg-white text-teal-700' : 'bg-teal-700 text-teal-100 hover:bg-teal-800'}`}
              >
                Admin
              </Link>
            )}

            {/* Symmetrical action pills */}
            <Link
              href="/donations"
              className={`rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-teal-700 ${pathname === '/donations' ? 'bg-teal-700 text-white' : 'text-white'}`}
            >
              Browse
            </Link>

            <Link
              href="/create-donation"
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 shadow"
            >
              + Donate
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-white hover:bg-teal-700 transition-colors"
                >
                  {user.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover border border-teal-300"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-semibold">{user.name.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition">
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
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
          <div className="mt-3 flex flex-col gap-2 border-t border-teal-500 pt-4 text-sm font-medium">
            {user ? (
              <>
                {/* User identity */}
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-teal-700 transition"
                >
                  {user.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-teal-300 flex-shrink-0" />
                  ) : (
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-bold text-white">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-semibold text-white">{user.name.split(' ')[0]}</span>
                </Link>

                <div className="my-1 border-t border-teal-500/50" />

                {[
                  { href: '/donations', label: 'Browse Donations' },
                  { href: '/my-donations', label: 'My Donations' },
                  { href: '/saved', label: 'Saved' },
                  { href: '/dashboard', label: 'Dashboard' },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-lg px-3 py-2.5 transition hover:bg-teal-700 ${pathname === href || (href !== '/donations' && pathname.startsWith(href + '/')) ? 'bg-teal-700 text-white font-bold' : 'text-teal-100'}`}
                  >
                    {label}
                  </Link>
                ))}

                <Link
                  href="/messages"
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-teal-700 ${pathname.startsWith('/messages') ? 'bg-teal-700 text-white font-bold' : 'text-teal-100'}`}
                >
                  <span>Messages</span>
                  {totalUnread > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </Link>

                <Link
                  href="/notifications"
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-teal-700 ${pathname === '/notifications' ? 'bg-teal-700 text-white font-bold' : 'text-teal-100'}`}
                >
                  <span>Notifications</span>
                  {unreadNotifications > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`rounded-lg px-3 py-2.5 transition hover:bg-teal-700 ${pathname === '/admin' ? 'bg-teal-700 text-white font-bold' : 'text-teal-100'}`}
                  >
                    Admin Panel
                  </Link>
                )}

                <div className="my-1 border-t border-teal-500/50" />

                <Link
                  href="/create-donation"
                  className="rounded-lg bg-teal-500 px-3 py-2.5 text-center font-semibold text-white hover:bg-teal-600 transition"
                >
                  + Donate
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2.5 text-left text-teal-200 hover:bg-teal-700 hover:text-white transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/donations"
                  className={`rounded-lg px-3 py-2.5 text-center transition hover:bg-teal-700 ${pathname === '/donations' ? 'bg-teal-700 text-white font-bold' : 'text-teal-100'}`}
                >
                  Browse Donations
                </Link>
                <Link
                  href="/create-donation"
                  className="rounded-lg bg-teal-500 px-3 py-2.5 text-center font-semibold text-white hover:bg-teal-600 transition"
                >
                  + Donate
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-teal-300 px-3 py-2.5 text-center font-semibold text-white hover:bg-teal-700 transition"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
