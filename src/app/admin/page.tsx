'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  adminDeleteDonation,
  flagDonation,
  getAllDonationsAdmin,
  getAllUsers,
  getAdminLogs,
  getPlatformSettings,
  logAdminAction,
  setDonationFeatured,
  setDonationStatus,
  setUserRole,
  setUserStatus,
  unflagDonation,
  updatePlatformSettings,
} from '@/lib/admin';
import { CATEGORIES } from '@/constants/config';
import { AdminLog, Donation, PlatformSettings, User } from '@/types';

type Tab = 'overview' | 'users' | 'donations' | 'moderation' | 'featured' | 'analytics' | 'settings' | 'logs';

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'overview',    label: 'Dashboard',   icon: '📊' },
  { tab: 'users',       label: 'Users',        icon: '👥' },
  { tab: 'donations',   label: 'Donations',    icon: '📦' },
  { tab: 'moderation',  label: 'Moderation',   icon: '⚠️' },
  { tab: 'featured',    label: 'Featured',     icon: '⭐' },
  { tab: 'analytics',   label: 'Analytics',    icon: '📈' },
  { tab: 'settings',    label: 'Settings',     icon: '⚙️' },
  { tab: 'logs',        label: 'Logs',         icon: '📝' },
];

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
  suspended: 'bg-yellow-100 text-yellow-800',
  banned:    'bg-red-100 text-red-700',
};

function getCategoryName(id: Donation['category']) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';
}

function fmt(date: Date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── User Details Modal ───────────────────────────────────────────────────────
function UserModal({
  u,
  currentUid,
  actionPending,
  onClose,
  onStatus,
  onRole,
}: {
  u: User;
  currentUid: string;
  actionPending: string | null;
  onClose: () => void;
  onStatus: (uid: string, status: User['status']) => void;
  onRole: (uid: string, role: User['role']) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 bg-gray-900 px-6 py-5">
          {u.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.profileImage} alt={u.name} className="h-14 w-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {u.name.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold text-white truncate">{u.name}</p>
            <p className="text-sm text-gray-300 truncate">{u.email}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Phone</p>
              <p className="text-gray-800">{u.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">City</p>
              <p className="text-gray-800">{u.city || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">State</p>
              <p className="text-gray-800">{u.state || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Pincode</p>
              <p className="text-gray-800">{u.pincode || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Address</p>
              <p className="text-gray-800">{u.address || '—'}</p>
            </div>
            {u.bio && (
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Bio</p>
                <p className="text-gray-800">{u.bio}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 rounded-lg bg-gray-50 px-4 py-3 text-center text-sm">
            <div>
              <p className="text-xl font-bold text-teal-600">{u.donationCount}</p>
              <p className="text-xs text-gray-500">Donations</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{u.receivedCount}</p>
              <p className="text-xs text-gray-500">Received</p>
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-500">{u.rating > 0 ? u.rating.toFixed(1) : '—'}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>{u.status}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
            {u.isVerified && <span className="rounded px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-700">✓ Verified</span>}
          </div>

          <div className="text-xs text-gray-400">
            Joined {fmt(u.createdAt)}
          </div>
        </div>

        {/* Actions */}
        {u.uid !== currentUid && (
          <div className="border-t px-6 py-4 flex flex-wrap gap-2">
            {u.status === 'active' && (
              <>
                <button
                  onClick={() => onStatus(u.uid, 'suspended')}
                  disabled={actionPending === u.uid}
                  className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40"
                >
                  Suspend
                </button>
                <button
                  onClick={() => onStatus(u.uid, 'banned')}
                  disabled={actionPending === u.uid}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40"
                >
                  Ban
                </button>
              </>
            )}
            {(u.status === 'suspended' || u.status === 'banned') && (
              <button
                onClick={() => onStatus(u.uid, 'active')}
                disabled={actionPending === u.uid}
                className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40"
              >
                Restore
              </button>
            )}
            <button
              onClick={() => onRole(u.uid, u.role === 'admin' ? 'user' : 'admin')}
              disabled={actionPending === u.uid + '-role'}
              className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-40"
            >
              {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
            </button>
            <button onClick={onClose} className="ml-auto rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">
              Close
            </button>
          </div>
        )}
        {u.uid === currentUid && (
          <div className="border-t px-6 py-4 flex justify-end">
            <button onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────
function SidebarNav({
  tab,
  setTab,
  setSidebarOpen,
  userName,
  userCount,
  donationCount,
  featuredCount,
  flaggedCount,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  setSidebarOpen: (open: boolean) => void;
  userName: string;
  userCount: number;
  donationCount: number;
  featuredCount: number;
  flaggedCount: number;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-700">
        <p className="text-lg font-bold text-white">⚡ Admin</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{userName}</p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ tab: t, label, icon }) => {
          const badge =
            t === 'users'      ? userCount :
            t === 'donations'  ? donationCount :
            t === 'moderation' ? flaggedCount :
            t === 'featured'   ? featuredCount :
            0;
          const urgent = t === 'moderation' && flaggedCount > 0;
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${urgent ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-200'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
        <Link href="/" className="block w-full rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition text-center">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth]   = useState(true);
  const [tab, setTab]                     = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [users, setUsers]                 = useState<User[]>([]);
  const [donations, setDonations]         = useState<Donation[]>([]);
  const [dataLoading, setDataLoading]     = useState(false);
  const [dataLoaded, setDataLoaded]       = useState(false);
  const [userSearch, setUserSearch]       = useState('');
  const [donationFilter, setDonationFilter] = useState<'all' | Donation['status']>('all');
  const [actionPending, setActionPending] = useState<string | null>(null);
  // bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending]     = useState(false);
  // user details modal
  const [viewUser, setViewUser]           = useState<User | null>(null);
  // flag modal
  const [flagTarget, setFlagTarget]       = useState<Donation | null>(null);
  const [flagReason, setFlagReason]       = useState('');
  // logs
  const [logs, setLogs]                   = useState<AdminLog[]>([]);
  const [logsLoaded, setLogsLoaded]       = useState(false);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [logSearch, setLogSearch]         = useState('');
  // settings
  const [settingsData, setSettingsData]   = useState<PlatformSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved]  = useState(false);

  // ── Auth checks ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  // ── Load core data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'admin' || dataLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDataLoading(true);
    Promise.all([getAllUsers(), getAllDonationsAdmin()])
      .then(([u, d]) => { setUsers(u); setDonations(d); setDataLoaded(true); })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user, dataLoaded]);

  // ── Lazy-load logs ───────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'logs' || logsLoaded || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogsLoading(true);
    getAdminLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => { setLogsLoaded(true); setLogsLoading(false); });
  }, [tab, logsLoaded, user]);

  // ── Lazy-load settings ───────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'settings' || settingsLoaded || !user) return;
    getPlatformSettings()
      .then((s) => { setSettingsData(s); setSettingsLoaded(true); })
      .catch(() => {});
  }, [tab, settingsLoaded, user]);

  // ── Log helper (fire-and-forget) ─────────────────────────────────────────
  const auditLog = useCallback(
    (action: string, targetType: AdminLog['targetType'], targetId: string, details: string) => {
      if (!user) return;
      logAdminAction(user.uid, user.name || user.email, action, targetType, targetId, details).catch(() => {});
    },
    [user]
  );

  // ── User handlers ────────────────────────────────────────────────────────
  const handleUserStatus = async (uid: string, status: User['status']) => {
    setActionPending(uid);
    try {
      await setUserStatus(uid, status);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
      if (viewUser?.uid === uid) setViewUser((v) => v ? { ...v, status } : v);
      auditLog('user_status', 'user', uid, `Status → ${status}`);
    } finally {
      setActionPending(null);
    }
  };

  const handleUserRole = async (uid: string, role: User['role']) => {
    setActionPending(uid + '-role');
    try {
      await setUserRole(uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
      if (viewUser?.uid === uid) setViewUser((v) => v ? { ...v, role } : v);
      auditLog('user_role', 'user', uid, `Role → ${role}`);
    } finally {
      setActionPending(null);
    }
  };

  // ── Bulk user actions ────────────────────────────────────────────────────
  const handleBulkAction = async (action: 'suspend' | 'ban' | 'restore' | 'make-admin' | 'remove-admin') => {
    if (selectedUsers.size === 0) return;
    setBulkPending(true);
    try {
      const ids = [...selectedUsers];
      await Promise.all(
        ids.map((uid) => {
          if (action === 'make-admin')   return setUserRole(uid, 'admin');
          if (action === 'remove-admin') return setUserRole(uid, 'user');
          if (action === 'suspend')      return setUserStatus(uid, 'suspended');
          if (action === 'ban')          return setUserStatus(uid, 'banned');
          if (action === 'restore')      return setUserStatus(uid, 'active');
          return Promise.resolve();
        })
      );
      setUsers((prev) =>
        prev.map((u) => {
          if (!selectedUsers.has(u.uid)) return u;
          if (action === 'make-admin')   return { ...u, role: 'admin' as User['role'] };
          if (action === 'remove-admin') return { ...u, role: 'user' as User['role'] };
          if (action === 'suspend')      return { ...u, status: 'suspended' as User['status'] };
          if (action === 'ban')          return { ...u, status: 'banned' as User['status'] };
          if (action === 'restore')      return { ...u, status: 'active' as User['status'] };
          return u;
        })
      );
      auditLog('bulk_' + action, 'user', ids.join(','), `Bulk ${action} on ${ids.length} users`);
      setSelectedUsers(new Set());
    } finally {
      setBulkPending(false);
    }
  };

  // ── Donation handlers ────────────────────────────────────────────────────
  const handleDonationStatus = async (id: string, status: Donation['status']) => {
    setActionPending(id);
    try {
      await setDonationStatus(id, status);
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      auditLog('donation_status', 'donation', id, `Status → ${status}`);
    } finally {
      setActionPending(null);
    }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    setActionPending(id + '-feat');
    try {
      await setDonationFeatured(id, !current);
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, featured: !current } : d)));
      auditLog('donation_featured', 'donation', id, `Featured → ${!current}`);
    } finally {
      setActionPending(null);
    }
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm('Permanently delete this donation? This cannot be undone.')) return;
    setActionPending(id + '-del');
    try {
      await adminDeleteDonation(id);
      setDonations((prev) => prev.filter((d) => d.id !== id));
      auditLog('donation_delete', 'donation', id, 'Deleted');
    } finally {
      setActionPending(null);
    }
  };

  const handleFlagSubmit = async () => {
    if (!flagTarget || !flagReason.trim()) return;
    setActionPending(flagTarget.id + '-flag');
    try {
      await flagDonation(flagTarget.id, flagReason.trim());
      setDonations((prev) => prev.map((d) => d.id === flagTarget.id ? { ...d, flagged: true, flagReason: flagReason.trim() } : d));
      auditLog('donation_flag', 'donation', flagTarget.id, `Flagged: ${flagReason.trim()}`);
    } finally {
      setActionPending(null);
      setFlagTarget(null);
      setFlagReason('');
    }
  };

  const handleUnflag = async (id: string) => {
    setActionPending(id + '-unflag');
    try {
      await unflagDonation(id);
      setDonations((prev) => prev.map((d) => d.id === id ? { ...d, flagged: false, flagReason: '' } : d));
      auditLog('donation_unflag', 'donation', id, 'Flag removed');
    } finally {
      setActionPending(null);
    }
  };

  // ── Settings handler ─────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!settingsData) return;
    setSettingsSaving(true);
    try {
      await updatePlatformSettings(settingsData);
      auditLog('update_settings', 'settings', 'platform', 'Platform settings updated');
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Loading / access guards ───────────────────────────────────────────────
  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }
  if (!user) return null;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-10 shadow text-center">
          <p className="text-5xl mb-4">🚫</p>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const stats = {
    totalUsers:         users.length,
    activeUsers:        users.filter((u) => u.status === 'active').length,
    bannedUsers:        users.filter((u) => u.status !== 'active').length,
    totalDonations:     donations.length,
    activeDonations:    donations.filter((d) => d.status === 'active').length,
    completedDonations: donations.filter((d) => d.status === 'completed').length,
    rejectedDonations:  donations.filter((d) => d.status === 'rejected').length,
    flaggedDonations:   donations.filter((d) => d.flagged).length,
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
  });

  const filteredDonations = donations.filter(
    (d) => donationFilter === 'all' || d.status === donationFilter
  );

  const flaggedDonations = donations.filter((d) => d.flagged);

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.toLowerCase();
    return !q || l.action.toLowerCase().includes(q) || l.adminName.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Flag modal */}
      {flagTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-1">Flag Donation</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{flagTarget.title}</p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason for flagging (e.g. inappropriate content, spam)..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { setFlagTarget(null); setFlagReason(''); }} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button>
              <button
                onClick={handleFlagSubmit}
                disabled={!flagReason.trim() || actionPending === flagTarget.id + '-flag'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User details modal */}
      {viewUser && (
        <UserModal
          u={viewUser}
          currentUid={user.uid}
          actionPending={actionPending}
          onClose={() => setViewUser(null)}
          onStatus={handleUserStatus}
          onRole={handleUserRole}
        />
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto lg:h-auto lg:min-h-screen ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarNav
            tab={tab}
            setTab={setTab}
            setSidebarOpen={setSidebarOpen}
            userName={user.name || user.email}
            userCount={users.length}
            donationCount={donations.length}
            featuredCount={donations.filter((d) => d.featured).length}
            flaggedCount={stats.flaggedDonations}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-gray-900">Admin Dashboard</span>
            {stats.flaggedDonations > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {stats.flaggedDonations} flagged
              </span>
            )}
          </header>

          {/* Desktop section header */}
          <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {NAV_ITEMS.find((n) => n.tab === tab)?.icon}{' '}
                {NAV_ITEMS.find((n) => n.tab === tab)?.label}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Logged in as <span className="font-semibold text-gray-600">{user.name || user.email}</span>
              </p>
            </div>
            {stats.flaggedDonations > 0 && (
              <button
                onClick={() => setTab('moderation')}
                className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition"
              >
                ⚠️ {stats.flaggedDonations} item{stats.flaggedDonations !== 1 ? 's' : ''} need review
              </button>
            )}
          </div>

          <main className="flex-1 p-4 sm:p-6">
            {dataLoading && (
              <div className="flex justify-center py-20">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
              </div>
            )}

            {/* ── OVERVIEW ── */}
            {!dataLoading && tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Total Users',       value: stats.totalUsers,         color: 'text-teal-600',  tab: 'users' as Tab },
                    { label: 'Active Users',       value: stats.activeUsers,        color: 'text-green-600', tab: 'users' as Tab },
                    { label: 'Suspended/Banned',   value: stats.bannedUsers,        color: 'text-red-600',   tab: 'users' as Tab },
                    { label: 'Total Donations',    value: stats.totalDonations,     color: 'text-teal-600',  tab: 'donations' as Tab },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setTab(s.tab)}
                      className="rounded-xl bg-white p-5 shadow text-center hover:shadow-md transition"
                    >
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Active Donations',    value: stats.activeDonations,    color: 'text-green-600', tab: 'donations' as Tab },
                    { label: 'Completed',           value: stats.completedDonations, color: 'text-blue-600',  tab: 'donations' as Tab },
                    { label: 'Rejected',            value: stats.rejectedDonations,  color: 'text-red-600',   tab: 'donations' as Tab },
                    { label: 'Flagged',             value: stats.flaggedDonations,   color: stats.flaggedDonations > 0 ? 'text-orange-600' : 'text-gray-500', tab: 'moderation' as Tab },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setTab(s.tab)}
                      className="rounded-xl bg-white p-5 shadow text-center hover:shadow-md transition"
                    >
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-5 shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-800">Recent Users</h2>
                      <button onClick={() => setTab('users')} className="text-xs text-teal-600 hover:underline">View all</button>
                    </div>
                    {users.slice(0, 5).map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => setViewUser(u)}
                        className="w-full flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition"
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>{u.status}</span>
                      </button>
                    ))}
                    {users.length === 0 && <p className="text-sm text-gray-400">No users yet.</p>}
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-800">Recent Donations</h2>
                      <button onClick={() => setTab('donations')} className="text-xs text-teal-600 hover:underline">View all</button>
                    </div>
                    {donations.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-sm font-semibold text-gray-800">{d.title}</p>
                          <p className="text-xs text-gray-500">{d.location.city}</p>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize flex-shrink-0 ${STATUS_BADGE[d.status] ?? ''}`}>{d.status}</span>
                      </div>
                    ))}
                    {donations.length === 0 && <p className="text-sm text-gray-400">No donations yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {!dataLoading && tab === 'users' && (
              <div className="rounded-xl bg-white shadow overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <input
                    type="text"
                    placeholder="Search name, email or city…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="flex-1 min-w-[180px] max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Bulk action bar */}
                {selectedUsers.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 bg-teal-50 border-b border-teal-200 px-4 py-2">
                    <span className="text-sm font-semibold text-teal-800">{selectedUsers.size} selected</span>
                    <button onClick={() => handleBulkAction('suspend')} disabled={bulkPending} className="rounded bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40">Suspend All</button>
                    <button onClick={() => handleBulkAction('ban')} disabled={bulkPending} className="rounded bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Ban All</button>
                    <button onClick={() => handleBulkAction('restore')} disabled={bulkPending} className="rounded bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Restore All</button>
                    <button onClick={() => handleBulkAction('make-admin')} disabled={bulkPending} className="rounded bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-40">Make Admin</button>
                    <button onClick={() => handleBulkAction('remove-admin')} disabled={bulkPending} className="rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-40">Remove Admin</button>
                    <button onClick={() => setSelectedUsers(new Set())} className="ml-auto text-xs text-gray-500 hover:text-gray-800">✕ Clear</button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={filteredUsers.length > 0 && filteredUsers.every((u) => u.uid === user.uid || selectedUsers.has(u.uid))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(new Set(filteredUsers.filter((u) => u.uid !== user.uid).map((u) => u.uid)));
                              } else {
                                setSelectedUsers(new Set());
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Donations</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.uid} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {u.uid !== user.uid && (
                              <input
                                type="checkbox"
                                checked={selectedUsers.has(u.uid)}
                                onChange={(e) => {
                                  const next = new Set(selectedUsers);
                                  if (e.target.checked) next.add(u.uid); else next.delete(u.uid);
                                  setSelectedUsers(next);
                                }}
                                className="rounded"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setViewUser(u)} className="text-left hover:text-teal-600 transition">
                              <p className="font-semibold text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{u.city || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{u.donationCount}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {u.uid === user.uid ? (
                              <span className="text-xs text-gray-400">You</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => setViewUser(u)} className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">View</button>
                                {u.status === 'active' && (
                                  <>
                                    <button onClick={() => handleUserStatus(u.uid, 'suspended')} disabled={actionPending === u.uid} className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40">Suspend</button>
                                    <button onClick={() => handleUserStatus(u.uid, 'banned')}    disabled={actionPending === u.uid} className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Ban</button>
                                  </>
                                )}
                                {(u.status === 'suspended' || u.status === 'banned') && (
                                  <button onClick={() => handleUserStatus(u.uid, 'active')} disabled={actionPending === u.uid} className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Restore</button>
                                )}
                                <button onClick={() => handleUserRole(u.uid, u.role === 'admin' ? 'user' : 'admin')} disabled={actionPending === u.uid + '-role'} className="rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-40">
                                  {u.role === 'admin' ? '−Admin' : '+Admin'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── DONATIONS ── */}
            {!dataLoading && tab === 'donations' && (
              <div className="rounded-xl bg-white shadow">
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <span className="text-sm font-semibold text-gray-700">Filter:</span>
                  {(['all', 'active', 'completed', 'rejected'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setDonationFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${donationFilter === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {s} ({s === 'all' ? donations.length : donations.filter((d) => d.status === s).length})
                    </button>
                  ))}
                </div>
                <div className="divide-y">
                  {filteredDonations.map((d) => (
                    <div key={d.id} className={`flex items-start gap-4 p-4 hover:bg-gray-50 ${d.flagged ? 'bg-red-50' : ''}`}>
                      {d.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.images[0]} alt={d.title} className="h-14 w-14 flex-shrink-0 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/donations/${d.id}`} className="font-semibold text-gray-900 hover:text-teal-600 truncate">{d.title}</Link>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[d.status] ?? ''}`}>{d.status}</span>
                          {d.flagged && <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">⚠️ Flagged</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{getCategoryName(d.category)} · {d.location.city} · {d.viewCount} views</p>
                        {d.flagged && d.flagReason && <p className="mt-0.5 text-xs text-red-600">Flag: {d.flagReason}</p>}
                        <p className="mt-1 line-clamp-1 text-xs text-gray-400">{d.description}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap gap-1">
                        {d.status !== 'active'    && <button onClick={() => handleDonationStatus(d.id, 'active')}    disabled={actionPending === d.id} className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Approve</button>}
                        {d.status !== 'rejected'  && <button onClick={() => handleDonationStatus(d.id, 'rejected')}  disabled={actionPending === d.id} className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Reject</button>}
                        {d.flagged
                          ? <button onClick={() => handleUnflag(d.id)} disabled={actionPending === d.id + '-unflag'} className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200 disabled:opacity-40">Unflag</button>
                          : <button onClick={() => setFlagTarget(d)} className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200">Flag</button>
                        }
                        <button onClick={() => handleDeleteDonation(d.id)} disabled={actionPending === d.id + '-del'} className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-40">Delete</button>
                      </div>
                    </div>
                  ))}
                  {filteredDonations.length === 0 && <div className="py-10 text-center text-gray-400">No donations found.</div>}
                </div>
              </div>
            )}

            {/* ── MODERATION ── */}
            {!dataLoading && tab === 'moderation' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 shadow flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-gray-800">Moderation Queue</p>
                    <p className="text-sm text-gray-500">
                      Flagged donations require admin review. Approve to clear the flag, Reject to mark as rejected, or Delete to remove permanently.
                    </p>
                  </div>
                </div>
                {flaggedDonations.length === 0 ? (
                  <div className="rounded-xl bg-white py-16 shadow text-center">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="font-semibold text-gray-700">Queue is clear</p>
                    <p className="text-sm text-gray-400 mt-1">No flagged donations to review.</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white shadow divide-y overflow-hidden">
                    {flaggedDonations.map((d) => (
                      <div key={d.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                        {d.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.images[0]} alt={d.title} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover bg-gray-100" />
                        ) : (
                          <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Link href={`/donations/${d.id}`} className="font-semibold text-gray-900 hover:text-teal-600 truncate block">{d.title}</Link>
                          <p className="text-xs text-gray-500 mt-0.5">{getCategoryName(d.category)} · {d.location.city} · {d.viewCount} views · {fmt(d.createdAt)}</p>
                          {d.flagReason && (
                            <p className="mt-1 text-xs bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700">
                              <span className="font-semibold">Flag reason:</span> {d.flagReason}
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs text-gray-400">{d.description}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1.5">
                          <button onClick={() => handleUnflag(d.id)} disabled={actionPending === d.id + '-unflag'} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">✓ Approve</button>
                          <button onClick={() => handleDonationStatus(d.id, 'rejected')} disabled={actionPending === d.id} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Reject</button>
                          <button onClick={() => handleDeleteDonation(d.id)} disabled={actionPending === d.id + '-del'} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-40">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── FEATURED ── */}
            {!dataLoading && tab === 'featured' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 shadow">
                  <p className="text-sm text-gray-500">
                    Pinned donations always appear first in the homepage &ldquo;Featured Donations&rdquo; section.
                    Unpin to let high-view donations take their place automatically.
                  </p>
                </div>
                {donations.filter((d) => d.status === 'active').length === 0 ? (
                  <div className="rounded-xl bg-white py-16 shadow text-center text-gray-400">No active donations yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {donations
                      .filter((d) => d.status === 'active')
                      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.viewCount - a.viewCount)
                      .map((d) => (
                        <div key={d.id} className={`rounded-xl bg-white shadow overflow-hidden transition ${d.featured ? 'ring-2 ring-yellow-400' : ''}`}>
                          <div
                            className="h-36 bg-gray-100 bg-cover bg-center relative"
                            style={{ backgroundImage: d.images[0] ? `url(${d.images[0]})` : undefined }}
                          >
                            {d.featured && (
                              <span className="absolute top-2 left-2 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-yellow-900">⭐ Featured</span>
                            )}
                            <span className="absolute top-2 right-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">{d.viewCount} views</span>
                          </div>
                          <div className="p-3">
                            <p className="truncate font-semibold text-gray-900 text-sm">{d.title}</p>
                            <p className="text-xs text-gray-500">{getCategoryName(d.category)} · {d.location.city}</p>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleToggleFeatured(d.id, d.featured ?? false)}
                                disabled={actionPending === d.id + '-feat'}
                                className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${d.featured ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              >
                                {actionPending === d.id + '-feat' ? '…' : d.featured ? 'Unpin' : '⭐ Pin'}
                              </button>
                              <Link href={`/donations/${d.id}`} className="rounded bg-teal-50 px-2 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition">View</Link>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {!dataLoading && tab === 'analytics' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-5 shadow">
                  <h2 className="mb-4 font-semibold text-gray-800">Donations by Category</h2>
                  {(() => {
                    const counts: Record<string, number> = {};
                    donations.forEach((d) => { counts[getCategoryName(d.category)] = (counts[getCategoryName(d.category)] ?? 0) + 1; });
                    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                    const max = sorted[0]?.[1] ?? 1;
                    return sorted.length === 0 ? <p className="text-sm text-gray-400">No data yet.</p> : (
                      <div className="space-y-2">
                        {sorted.map(([cat, count]) => (
                          <div key={cat} className="flex items-center gap-3">
                            <span className="w-28 flex-shrink-0 text-right text-xs text-gray-600">{cat}</span>
                            <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
                              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                            <span className="w-6 text-xs font-semibold text-gray-700">{count}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-5 shadow">
                    <h2 className="mb-4 font-semibold text-gray-800">Donations by Status</h2>
                    {(['active', 'completed', 'rejected'] as const).map((s) => {
                      const count = donations.filter((d) => d.status === s).length;
                      const pct = donations.length ? Math.round((count / donations.length) * 100) : 0;
                      const colors: Record<string, string> = { active: 'bg-green-500', completed: 'bg-blue-500', rejected: 'bg-red-400' };
                      return (
                        <div key={s} className="mb-2 flex items-center gap-3">
                          <span className="w-20 flex-shrink-0 text-right text-xs capitalize text-gray-600">{s}</span>
                          <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${colors[s]}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-14 text-xs font-semibold text-gray-700">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow">
                    <h2 className="mb-4 font-semibold text-gray-800">Top Cities (Donations)</h2>
                    {(() => {
                      const counts: Record<string, number> = {};
                      donations.forEach((d) => { const city = d.location.city || 'Unknown'; counts[city] = (counts[city] ?? 0) + 1; });
                      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                      const max = sorted[0]?.[1] ?? 1;
                      return sorted.length === 0 ? <p className="text-sm text-gray-400">No data yet.</p> : (
                        <div className="space-y-2">
                          {sorted.map(([city, count]) => (
                            <div key={city} className="flex items-center gap-3">
                              <span className="w-24 flex-shrink-0 truncate text-right text-xs text-gray-600">{city}</span>
                              <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                              </div>
                              <span className="w-6 text-xs font-semibold text-gray-700">{count}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-5 shadow">
                  <h2 className="mb-4 font-semibold text-gray-800">Users by Role &amp; Status</h2>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: 'Regular Users',     value: users.filter((u) => u.role === 'user').length,     color: 'text-gray-900' },
                      { label: 'Admins',            value: users.filter((u) => u.role === 'admin').length,    color: 'text-purple-700' },
                      { label: 'Suspended',         value: users.filter((u) => u.status === 'suspended').length, color: 'text-yellow-600' },
                      { label: 'Banned',            value: users.filter((u) => u.status === 'banned').length, color: 'text-red-600' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-gray-50 px-6 py-4 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="mt-1 text-xs text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {!dataLoading && tab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                {!settingsLoaded ? (
                  <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
                ) : settingsData && (
                  <>
                    <div className="rounded-xl bg-white p-6 shadow space-y-4">
                      <h2 className="font-semibold text-gray-800 text-base">Platform Info</h2>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Platform Name</label>
                        <input
                          value={settingsData.platformName}
                          onChange={(e) => setSettingsData({ ...settingsData, platformName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tagline</label>
                        <input
                          value={settingsData.tagline}
                          onChange={(e) => setSettingsData({ ...settingsData, tagline: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Support Email</label>
                        <input
                          type="email"
                          value={settingsData.supportEmail}
                          onChange={(e) => setSettingsData({ ...settingsData, supportEmail: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow space-y-4">
                      <h2 className="font-semibold text-gray-800 text-base">Feature Toggles</h2>
                      {([
                        { key: 'messagingEnabled',              label: 'Messaging',                         desc: 'Allow users to message each other about donations' },
                        { key: 'requireVerificationForPosting', label: 'Require verification to post',      desc: 'Users must be verified before posting a donation' },
                      ] as { key: keyof PlatformSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                        <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{label}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                          <div
                            onClick={() => setSettingsData({ ...settingsData, [key]: !settingsData[key] })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${settingsData[key] ? 'bg-teal-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settingsData[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </label>
                      ))}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Max Donations per User per Day</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={settingsData.maxDonationsPerDay}
                          onChange={(e) => setSettingsData({ ...settingsData, maxDonationsPerDay: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-28 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveSettings}
                        disabled={settingsSaving}
                        className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition"
                      >
                        {settingsSaving ? 'Saving…' : 'Save Settings'}
                      </button>
                      {settingsSaved && <span className="text-sm text-green-600 font-semibold">✓ Saved</span>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── LOGS ── */}
            {!dataLoading && tab === 'logs' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 shadow">
                  <input
                    type="text"
                    placeholder="Search by action, admin, or details…"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {logsLoading ? (
                  <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
                ) : filteredLogs.length === 0 ? (
                  <div className="rounded-xl bg-white py-16 shadow text-center">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="font-semibold text-gray-700">{logSearch ? 'No logs match your search' : 'No admin actions logged yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">Actions like ban, suspend, delete, and approve will appear here.</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white shadow overflow-hidden">
                    <div className="divide-y">
                      {filteredLogs.map((l) => {
                        const actionColors: Record<string, string> = {
                          user_status:       'bg-yellow-100 text-yellow-800',
                          user_role:         'bg-purple-100 text-purple-700',
                          donation_status:   'bg-blue-100 text-blue-700',
                          donation_delete:   'bg-red-100 text-red-700',
                          donation_flag:     'bg-orange-100 text-orange-700',
                          donation_unflag:   'bg-green-100 text-green-700',
                          donation_featured: 'bg-yellow-100 text-yellow-800',
                          update_settings:   'bg-gray-100 text-gray-700',
                        };
                        const color = actionColors[l.action] ?? 'bg-gray-100 text-gray-600';
                        return (
                          <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                            <span className={`mt-0.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${color}`}>
                              {l.action.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate">{l.details}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                by <span className="font-semibold">{l.adminName}</span>
                                {l.targetId && <> · ID: <span className="font-mono text-[10px]">{l.targetId.slice(0, 12)}…</span></>}
                              </p>
                            </div>
                            <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">{fmt(l.createdAt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
