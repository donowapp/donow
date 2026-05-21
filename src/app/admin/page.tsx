'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  adminDeleteDonation,
  getAllDonationsAdmin,
  getAllUsers,
  setDonationFeatured,
  setDonationStatus,
  setUserRole,
  setUserStatus,
} from '@/lib/admin';
import { CATEGORIES } from '@/constants/config';
import { Donation, User } from '@/types';

type Tab = 'overview' | 'users' | 'donations' | 'featured' | 'analytics';

function getCategoryName(id: Donation['category']) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-yellow-100 text-yellow-800',
  banned: 'bg-red-100 text-red-700',
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [donationFilter, setDonationFilter] = useState<'all' | Donation['status']>('all');
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || dataLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDataLoading(true);
    Promise.all([getAllUsers(), getAllDonationsAdmin()])
      .then(([fetchedUsers, fetchedDonations]) => {
        setUsers(fetchedUsers);
        setDonations(fetchedDonations);
        setDataLoaded(true);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user, dataLoaded]);

  const handleUserStatus = async (uid: string, status: User['status']) => {
    setActionPending(uid);
    try {
      await setUserStatus(uid, status);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
    } finally {
      setActionPending(null);
    }
  };

  const handleUserRole = async (uid: string, role: User['role']) => {
    setActionPending(uid + '-role');
    try {
      await setUserRole(uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
    } finally {
      setActionPending(null);
    }
  };

  const handleDonationStatus = async (id: string, status: Donation['status']) => {
    setActionPending(id);
    try {
      await setDonationStatus(id, status);
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    } finally {
      setActionPending(null);
    }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    setActionPending(id + '-feat');
    try {
      await setDonationFeatured(id, !current);
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, featured: !current } : d)));
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
    } finally {
      setActionPending(null);
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

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === 'active').length,
    bannedUsers: users.filter((u) => u.status === 'banned' || u.status === 'suspended').length,
    totalDonations: donations.length,
    activeDonations: donations.filter((d) => d.status === 'active').length,
    completedDonations: donations.filter((d) => d.status === 'completed').length,
    rejectedDonations: donations.filter((d) => d.status === 'rejected').length,
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
  });

  const filteredDonations = donations.filter(
    (d) => donationFilter === 'all' || d.status === donationFilter
  );

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-semibold rounded-lg transition ${
      tab === t ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-500">Manage users, donations, and platform activity.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button className={tabClass('overview')} onClick={() => setTab('overview')}>Overview</button>
          <button className={tabClass('users')} onClick={() => setTab('users')}>
            Users {users.length > 0 && <span className="ml-1 text-xs">({users.length})</span>}
          </button>
          <button className={tabClass('donations')} onClick={() => setTab('donations')}>
            Donations {donations.length > 0 && <span className="ml-1 text-xs">({donations.length})</span>}
          </button>
          <button className={tabClass('featured')} onClick={() => setTab('featured')}>
            ⭐ Featured {donations.filter((d) => d.featured).length > 0 && <span className="ml-1 text-xs">({donations.filter((d) => d.featured).length})</span>}
          </button>
          <button className={tabClass('analytics')} onClick={() => setTab('analytics')}>📊 Analytics</button>
        </div>

        {dataLoading && (
          <div className="flex justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        )}

        {!dataLoading && tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, color: 'text-teal-600' },
                { label: 'Active Users', value: stats.activeUsers, color: 'text-green-600' },
                { label: 'Suspended/Banned', value: stats.bannedUsers, color: 'text-red-600' },
                { label: 'Total Donations', value: stats.totalDonations, color: 'text-teal-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-white p-5 shadow text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: 'Active Donations', value: stats.activeDonations, color: 'text-green-600' },
                { label: 'Completed', value: stats.completedDonations, color: 'text-blue-600' },
                { label: 'Rejected', value: stats.rejectedDonations, color: 'text-red-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-white p-5 shadow text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-3 font-semibold text-gray-800">Recent Users</h2>
                {users.slice(0, 5).map((u) => (
                  <div key={u.uid} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-3 font-semibold text-gray-800">Recent Donations</h2>
                {donations.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-semibold text-gray-800">{d.title}</p>
                      <p className="text-xs text-gray-500">{d.location.city}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize flex-shrink-0 ${STATUS_BADGE[d.status] ?? ''}`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!dataLoading && tab === 'users' && (
          <div className="rounded-lg bg-white shadow">
            <div className="border-b p-4">
              <input
                type="text"
                placeholder="Search by name, email or city..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Donations</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.city || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{u.donationCount}</td>
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
                            {u.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleUserStatus(u.uid, 'suspended')}
                                  disabled={actionPending === u.uid}
                                  className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40"
                                >
                                  Suspend
                                </button>
                                <button
                                  onClick={() => handleUserStatus(u.uid, 'banned')}
                                  disabled={actionPending === u.uid}
                                  className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40"
                                >
                                  Ban
                                </button>
                              </>
                            )}
                            {(u.status === 'suspended' || u.status === 'banned') && (
                              <button
                                onClick={() => handleUserStatus(u.uid, 'active')}
                                disabled={actionPending === u.uid}
                                className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40"
                              >
                                Restore
                              </button>
                            )}
                            <button
                              onClick={() => handleUserRole(u.uid, u.role === 'admin' ? 'user' : 'admin')}
                              disabled={actionPending === u.uid + '-role'}
                              className="rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-40"
                            >
                              {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!dataLoading && tab === 'featured' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-500">
                Pinned donations always appear first in the homepage &ldquo;Featured Donations&rdquo; section.
                Unpin to let high-view donations take their place automatically.
              </p>
            </div>
            {donations.filter((d) => d.status === 'active').length === 0 ? (
              <div className="rounded-lg bg-white py-16 shadow text-center text-gray-400">No active donations yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {donations
                  .filter((d) => d.status === 'active')
                  .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.viewCount - a.viewCount)
                  .map((d) => (
                    <div
                      key={d.id}
                      className={`rounded-lg bg-white shadow overflow-hidden transition ${d.featured ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      <div
                        className="h-36 bg-gray-100 bg-cover bg-center relative"
                        style={{ backgroundImage: d.images[0] ? `url(${d.images[0]})` : undefined }}
                      >
                        {d.featured && (
                          <span className="absolute top-2 left-2 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-yellow-900">
                            ⭐ Featured
                          </span>
                        )}
                        <span className="absolute top-2 right-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                          {d.viewCount} views
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="truncate font-semibold text-gray-900 text-sm">{d.title}</p>
                        <p className="text-xs text-gray-500">{getCategoryName(d.category)} · {d.location.city}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleToggleFeatured(d.id, d.featured ?? false)}
                            disabled={actionPending === d.id + '-feat'}
                            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                              d.featured
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {actionPending === d.id + '-feat' ? '…' : d.featured ? 'Unpin' : '⭐ Pin to Featured'}
                          </button>
                          <Link
                            href={`/donations/${d.id}`}
                            className="rounded bg-teal-50 px-2 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {!dataLoading && tab === 'analytics' && (
          <div className="space-y-6">
            {/* Category breakdown */}
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="mb-4 font-semibold text-gray-800">Donations by Category</h2>
              {(() => {
                const counts: Record<string, number> = {};
                donations.forEach((d) => { counts[getCategoryName(d.category)] = (counts[getCategoryName(d.category)] ?? 0) + 1; });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                const max = sorted[0]?.[1] ?? 1;
                return sorted.length === 0 ? (
                  <p className="text-sm text-gray-400">No data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sorted.map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-28 flex-shrink-0 text-right text-xs text-gray-600">{cat}</span>
                        <div className="flex-1 rounded-full bg-gray-100 h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-xs font-semibold text-gray-700">{count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-5 shadow">
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
                      <span className="w-10 text-xs font-semibold text-gray-700">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>

              {/* Top cities */}
              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-4 font-semibold text-gray-800">Top Cities (Donations)</h2>
                {(() => {
                  const counts: Record<string, number> = {};
                  donations.forEach((d) => {
                    const city = d.location.city || 'Unknown';
                    counts[city] = (counts[city] ?? 0) + 1;
                  });
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                  const max = sorted[0]?.[1] ?? 1;
                  return sorted.length === 0 ? (
                    <p className="text-sm text-gray-400">No data yet.</p>
                  ) : (
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

            {/* User growth */}
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="mb-4 font-semibold text-gray-800">Users by Role</h2>
              <div className="flex gap-6">
                {(['user', 'admin'] as const).map((r) => {
                  const count = users.filter((u) => u.role === r).length;
                  return (
                    <div key={r} className="rounded-lg bg-gray-50 px-6 py-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="mt-1 text-xs capitalize text-gray-500">{r === 'admin' ? 'Admins' : 'Regular Users'}</p>
                    </div>
                  );
                })}
                <div className="rounded-lg bg-gray-50 px-6 py-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{users.filter((u) => u.status !== 'active').length}</p>
                  <p className="mt-1 text-xs text-gray-500">Suspended/Banned</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!dataLoading && tab === 'donations' && (
          <div className="rounded-lg bg-white shadow">
            <div className="flex flex-wrap items-center gap-3 border-b p-4">
              <span className="text-sm font-semibold text-gray-700">Filter:</span>
              {(['all', 'active', 'completed', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setDonationFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    donationFilter === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s} {s === 'all' ? `(${donations.length})` : `(${donations.filter((d) => d.status === s).length})`}
                </button>
              ))}
            </div>
            <div className="divide-y">
              {filteredDonations.map((d) => (
                <div key={d.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                  {d.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.images[0]} alt={d.title} className="h-14 w-14 flex-shrink-0 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/donations/${d.id}`} className="font-semibold text-gray-900 hover:text-teal-600 truncate">
                        {d.title}
                      </Link>
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[d.status] ?? ''}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {getCategoryName(d.category)} · {d.location.city} · {d.viewCount} views
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-400">{d.description}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-1">
                    {d.status !== 'active' && (
                      <button
                        onClick={() => handleDonationStatus(d.id, 'active')}
                        disabled={actionPending === d.id}
                        className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40"
                      >
                        Approve
                      </button>
                    )}
                    {d.status !== 'rejected' && (
                      <button
                        onClick={() => handleDonationStatus(d.id, 'rejected')}
                        disabled={actionPending === d.id}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDonation(d.id)}
                      disabled={actionPending === d.id + '-del'}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredDonations.length === 0 && (
                <div className="py-10 text-center text-gray-400">No donations found.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
