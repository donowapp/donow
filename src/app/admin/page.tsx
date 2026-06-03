'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  adminDeleteDonation,
  adminDeleteUser,
  Announcement,
  deleteAnnouncement,
  flagDonation,
  getAllDonationsAdmin,
  getAllUsers,
  getAdminLogs,
  getAnnouncements,
  getPlatformSettings,
  logAdminAction,
  sendAnnouncement,
  setDonationFeatured,
  setDonationStatus,
  setUserRole,
  setUserStatus,
  setUserVerified,
  toggleAnnouncement,
  unflagDonation,
  updatePlatformSettings,
} from '@/lib/admin';
import { CATEGORIES } from '@/constants/config';
import { AdminLog, Donation, PlatformSettings, User } from '@/types';

type Tab = 'overview' | 'users' | 'donations' | 'moderation' | 'featured' | 'analytics' | 'announcements' | 'settings' | 'logs';

const NAV_ITEMS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'overview',       label: 'Dashboard',      icon: '📊' },
  { tab: 'users',          label: 'Users',           icon: '👥' },
  { tab: 'donations',      label: 'Donations',       icon: '📦' },
  { tab: 'moderation',     label: 'Moderation',      icon: '⚠️' },
  { tab: 'featured',       label: 'Featured',        icon: '⭐' },
  { tab: 'analytics',      label: 'Analytics',       icon: '📈' },
  { tab: 'announcements',  label: 'Announcements',   icon: '📢' },
  { tab: 'settings',       label: 'Settings',        icon: '⚙️' },
  { tab: 'logs',           label: 'Audit Logs',      icon: '🔐' },
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
function fmtTime(date: Date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function exportCSV(filename: string, rows: Record<string, string | number | boolean>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? '');
        return v.includes(',') || v.includes('"') || v.includes('\n')
          ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── User Details Modal ───────────────────────────────────────────────────────
function UserModal({
  u, currentUid, actionPending, onClose, onStatus, onRole, onVerify, onDelete,
}: {
  u: User; currentUid: string; actionPending: string | null;
  onClose: () => void;
  onStatus: (uid: string, status: User['status']) => void;
  onRole: (uid: string, role: User['role']) => void;
  onVerify: (uid: string, verified: boolean) => void;
  onDelete: (uid: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-gray-900 to-slate-800 px-6 py-5">
          {u.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.profileImage} alt={u.name} className="h-14 w-14 rounded-full object-cover flex-shrink-0 border-2 border-teal-400" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {u.name.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-bold text-white truncate">{u.name}</p>
              {u.role === 'admin' && <span className="rounded-full bg-purple-500/30 border border-purple-400/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">ADMIN</span>}
              {u.isVerified && <span className="rounded-full bg-teal-500/30 border border-teal-400/40 px-2 py-0.5 text-[10px] font-bold text-teal-300">✓ VERIFIED</span>}
            </div>
            <p className="text-sm text-gray-300 truncate">{u.email}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x border-b bg-gray-50">
          {[
            { label: 'Donations', val: u.donationCount, color: 'text-teal-600' },
            { label: 'Received', val: u.receivedCount, color: 'text-blue-600' },
            { label: 'Rating', val: u.rating > 0 ? u.rating.toFixed(1) : '—', color: 'text-yellow-500' },
          ].map((s) => (
            <div key={s.label} className="py-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 max-h-[40vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Phone', u.phone], ['City', u.city], ['State', u.state], ['Pincode', u.pincode],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-0.5">{label}</p>
                <p className="text-gray-800">{val || '—'}</p>
              </div>
            ))}
            {u.address && (
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase text-gray-400 mb-0.5">Address</p>
                <p className="text-gray-800">{u.address}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs pt-1">
            <span className={`rounded px-2 py-0.5 font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>{u.status}</span>
            <span className={`rounded px-2 py-0.5 font-semibold capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
            <span className={`rounded px-2 py-0.5 font-semibold ${u.isVerified ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>{u.isVerified ? '✓ Verified' : 'Unverified'}</span>
          </div>
          <p className="text-xs text-gray-400">Joined {fmt(u.createdAt)}</p>
        </div>

        {/* Actions */}
        {u.uid !== currentUid ? (
          <div className="border-t px-5 py-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {u.status === 'active' && (
                <>
                  <button onClick={() => onStatus(u.uid, 'suspended')} disabled={actionPending === u.uid} className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40">Suspend</button>
                  <button onClick={() => onStatus(u.uid, 'banned')} disabled={actionPending === u.uid} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Ban</button>
                </>
              )}
              {(u.status === 'suspended' || u.status === 'banned') && (
                <button onClick={() => onStatus(u.uid, 'active')} disabled={actionPending === u.uid} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Restore</button>
              )}
              <button onClick={() => onRole(u.uid, u.role === 'admin' ? 'user' : 'admin')} disabled={actionPending === u.uid + '-role'} className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-40">
                {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
              </button>
              <button onClick={() => onVerify(u.uid, !u.isVerified)} disabled={actionPending === u.uid + '-verify'} className="rounded-lg bg-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-200 disabled:opacity-40">
                {u.isVerified ? 'Unverify' : '✓ Verify'}
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-dashed border-red-200">
              <span className="text-xs text-red-400 font-semibold">Danger Zone:</span>
              <button onClick={() => onDelete(u.uid)} disabled={!!actionPending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40">
                🗑 Delete User
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t px-5 py-4 flex justify-end">
            <button onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────
function SidebarNav({ tab, setTab, setSidebarOpen, userName, userEmail, userImage, userCount, donationCount, featuredCount, flaggedCount, announcementCount }: {
  tab: Tab; setTab: (t: Tab) => void; setSidebarOpen: (open: boolean) => void;
  userName: string; userEmail: string; userImage?: string;
  userCount: number; donationCount: number; featuredCount: number; flaggedCount: number; announcementCount: number;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Admin identity */}
      <div className="px-4 py-5 border-b border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="flex items-center gap-3 mb-2">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName} className="h-10 w-10 rounded-full object-cover border-2 border-teal-400 flex-shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white flex-shrink-0">
              {(userName || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-400/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-300 uppercase tracking-wider">
          ⚡ Super Admin
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ tab: t, label, icon }) => {
          const badge =
            t === 'users'         ? userCount :
            t === 'donations'     ? donationCount :
            t === 'moderation'    ? flaggedCount :
            t === 'featured'      ? featuredCount :
            t === 'announcements' ? announcementCount :
            0;
          const urgent = (t === 'moderation' && flaggedCount > 0);
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? 'bg-teal-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${urgent ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-600 text-gray-200'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700 space-y-1">
        <Link href="/" className="block w-full rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition text-center">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

// ─── Generic Image Upload Card ────────────────────────────────────────────────
function ImageUploadCard({ title, desc, url, badge, previewNode, onChange }: {
  title: string; desc: string; url: string; badge?: string;
  previewNode?: React.ReactNode;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState(url);
  const [error, setError] = useState('');

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => { setDraft(url); }, [url]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cloudName || !uploadPreset) return;
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.secure_url) { setDraft(data.secure_url); onChange(data.secure_url); }
      else setError('Upload failed. Try pasting a URL instead.');
    } catch { setError('Upload failed. Check your connection.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
        </div>
        {badge && <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">{badge}</span>}
      </div>
      <div className="relative h-36 w-full overflow-hidden rounded-xl bg-gray-100 border-2 border-dashed border-gray-200">
        {draft ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft} alt="preview" className="h-full w-full object-cover" />
            {previewNode}
            <span className="absolute top-2 right-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">Preview</span>
          </>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-gray-300 text-sm">
            <span className="text-3xl">🖼</span><span>No image set</span>
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Paste Image URL</label>
        <div className="flex gap-2">
          <input type="url" value={draft}
            onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
          {draft && (
            <button onClick={() => { setDraft(''); onChange(''); }}
              className="rounded-lg border border-gray-200 px-2.5 text-gray-400 hover:text-red-500 hover:border-red-200 transition text-sm">✕</button>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Or Upload from Device</label>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2.5 text-sm font-semibold transition ${uploading ? 'border-gray-200 text-gray-400' : 'border-teal-300 text-teal-600 hover:bg-teal-50'}`}>
          {uploading ? '⏳ Uploading…' : '📷 Choose image'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// ─── Badges Editor ────────────────────────────────────────────────────────────
type TrustBadge = { icon: string; label: string; enabled: boolean };

function BadgesEditor({ title, desc, badges, onChange }: {
  title: string; desc: string;
  badges: TrustBadge[];
  onChange: (b: TrustBadge[]) => void;
}) {
  const update = (i: number, patch: Partial<TrustBadge>) =>
    onChange(badges.map((b, idx) => idx === i ? { ...b, ...patch } : b));

  return (
    <div className="rounded-2xl bg-white p-6 shadow space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div className="space-y-2">
        {badges.map((b, i) => (
          <div key={i} className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${b.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
            <input value={b.icon} onChange={(e) => update(i, { icon: e.target.value })}
              className="w-12 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="✅" maxLength={4} />
            <input value={b.label} onChange={(e) => update(i, { label: e.target.value })}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Badge label" />
            <div onClick={() => update(i, { enabled: !b.enabled })}
              className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors flex-shrink-0 ${b.enabled ? 'bg-teal-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${b.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <button onClick={() => onChange(badges.filter((_, idx) => idx !== i))}
              className="flex-shrink-0 rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition text-base leading-none">×</button>
          </div>
        ))}
      </div>
      {badges.length < 10 && (
        <button onClick={() => onChange([...badges, { icon: '✨', label: 'New Badge', enabled: true }])}
          className="w-full rounded-lg border border-dashed border-teal-300 py-2 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition">
          + Add Badge
        </button>
      )}
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Live preview</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {badges.filter((b) => b.enabled).map((b, i) => (
            <span key={i} className="flex items-center gap-1">{b.icon} {b.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hero Stats Editor ────────────────────────────────────────────────────────
type HeroStat = { icon: string; label: string; val: string; sub: string };

function HeroStatsEditor({ stats, onChange }: {
  stats: HeroStat[];
  onChange: (s: HeroStat[]) => void;
}) {
  const update = (i: number, patch: Partial<HeroStat>) =>
    onChange(stats.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  return (
    <div className="rounded-2xl bg-white p-6 shadow space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800">📊 Hero Section Stats</h2>
        <p className="text-xs text-gray-400 mt-0.5">The 3 impact counters shown on the homepage hero (e.g. "1,50,000+ Items Donated").</p>
      </div>
      <div className="space-y-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { field: 'icon'  as const, label: 'Icon',     placeholder: '🎁',           bold: false },
                { field: 'val'   as const, label: 'Value',    placeholder: '1,50,000+',    bold: true  },
                { field: 'label' as const, label: 'Label',    placeholder: 'Items Donated', bold: false },
                { field: 'sub'   as const, label: 'Sub-text', placeholder: 'across India', bold: false },
              ].map(({ field, label, placeholder, bold }) => (
                <div key={field}>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">{label}</label>
                  <input value={s[field]} onChange={(e) => update(i, { [field]: e.target.value })}
                    placeholder={placeholder} maxLength={field === 'icon' ? 4 : 40}
                    className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 ${bold ? 'font-bold' : ''} ${field === 'icon' ? 'text-center' : ''}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
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
  const [donationSearch, setDonationSearch] = useState('');
  const [moderationSearch, setModerationSearch] = useState('');
  const [moderationReasonFilter, setModerationReasonFilter] = useState('');
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending]     = useState(false);
  const [viewUser, setViewUser]           = useState<User | null>(null);
  const [flagTarget, setFlagTarget]       = useState<Donation | null>(null);
  const [flagReason, setFlagReason]       = useState('');
  const [logs, setLogs]                   = useState<AdminLog[]>([]);
  const [logsLoaded, setLogsLoaded]       = useState(false);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [logSearch, setLogSearch]         = useState('');
  const [settingsData, setSettingsData]   = useState<PlatformSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved]  = useState(false);
  // announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMsg, setAnnounceMsg]     = useState('');
  const [announceSending, setAnnounceSending] = useState(false);
  const [announceSent, setAnnounceSent]   = useState(false);

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

  useEffect(() => {
    if (tab !== 'logs' || logsLoaded || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogsLoading(true);
    getAdminLogs().then(setLogs).catch(() => {}).finally(() => { setLogsLoaded(true); setLogsLoading(false); });
  }, [tab, logsLoaded, user]);

  useEffect(() => {
    if (tab !== 'settings' || settingsLoaded || !user) return;
    getPlatformSettings().then((s) => { setSettingsData(s); setSettingsLoaded(true); }).catch(() => {});
  }, [tab, settingsLoaded, user]);

  useEffect(() => {
    if (tab !== 'announcements' || announcementsLoaded || !user) return;
    getAnnouncements().then((a) => { setAnnouncements(a); setAnnouncementsLoaded(true); }).catch(() => {});
  }, [tab, announcementsLoaded, user]);

  const auditLog = useCallback(
    (action: string, targetType: AdminLog['targetType'], targetId: string, details: string) => {
      if (!user) return;
      logAdminAction(user.uid, user.name || user.email, action, targetType, targetId, details).catch(() => {});
    }, [user]
  );

  // ── User handlers ────────────────────────────────────────────────────────
  const handleUserStatus = async (uid: string, status: User['status']) => {
    setActionPending(uid);
    try {
      await setUserStatus(uid, status);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
      if (viewUser?.uid === uid) setViewUser((v) => v ? { ...v, status } : v);
      auditLog('user_status', 'user', uid, `Status → ${status}`);
    } finally { setActionPending(null); }
  };

  const handleUserRole = async (uid: string, role: User['role']) => {
    setActionPending(uid + '-role');
    try {
      await setUserRole(uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
      if (viewUser?.uid === uid) setViewUser((v) => v ? { ...v, role } : v);
      auditLog('user_role', 'user', uid, `Role → ${role}`);
    } finally { setActionPending(null); }
  };

  const handleUserVerify = async (uid: string, isVerified: boolean) => {
    setActionPending(uid + '-verify');
    try {
      await setUserVerified(uid, isVerified);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isVerified } : u)));
      if (viewUser?.uid === uid) setViewUser((v) => v ? { ...v, isVerified } : v);
      auditLog('user_verify', 'user', uid, `Verified → ${isVerified}`);
    } finally { setActionPending(null); }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Permanently delete this user and all their data? This cannot be undone.')) return;
    setActionPending(uid + '-delete');
    try {
      await adminDeleteUser(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setViewUser(null);
      auditLog('user_delete', 'user', uid, 'User permanently deleted');
    } finally { setActionPending(null); }
  };

  const handleBulkAction = async (action: 'suspend' | 'ban' | 'restore' | 'make-admin' | 'remove-admin' | 'verify' | 'unverify') => {
    if (selectedUsers.size === 0) return;
    setBulkPending(true);
    try {
      const ids = [...selectedUsers];
      await Promise.all(ids.map((uid) => {
        if (action === 'make-admin')   return setUserRole(uid, 'admin');
        if (action === 'remove-admin') return setUserRole(uid, 'user');
        if (action === 'suspend')      return setUserStatus(uid, 'suspended');
        if (action === 'ban')          return setUserStatus(uid, 'banned');
        if (action === 'restore')      return setUserStatus(uid, 'active');
        if (action === 'verify')       return setUserVerified(uid, true);
        if (action === 'unverify')     return setUserVerified(uid, false);
        return Promise.resolve();
      }));
      setUsers((prev) => prev.map((u) => {
        if (!selectedUsers.has(u.uid)) return u;
        if (action === 'make-admin')   return { ...u, role: 'admin' as User['role'] };
        if (action === 'remove-admin') return { ...u, role: 'user' as User['role'] };
        if (action === 'suspend')      return { ...u, status: 'suspended' as User['status'] };
        if (action === 'ban')          return { ...u, status: 'banned' as User['status'] };
        if (action === 'restore')      return { ...u, status: 'active' as User['status'] };
        if (action === 'verify')       return { ...u, isVerified: true };
        if (action === 'unverify')     return { ...u, isVerified: false };
        return u;
      }));
      auditLog('bulk_' + action, 'user', ids.join(','), `Bulk ${action} on ${ids.length} users`);
      setSelectedUsers(new Set());
    } finally { setBulkPending(false); }
  };

  // ── Donation handlers ────────────────────────────────────────────────────
  const handleDonationStatus = async (id: string, status: Donation['status']) => {
    setActionPending(id);
    try {
      await setDonationStatus(id, status);
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      auditLog('donation_status', 'donation', id, `Status → ${status}`);
    } finally { setActionPending(null); }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    setActionPending(id + '-feat');
    try {
      await setDonationFeatured(id, !current);
      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, featured: !current } : d)));
      auditLog('donation_featured', 'donation', id, `Featured → ${!current}`);
    } finally { setActionPending(null); }
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm('Permanently delete this donation? This cannot be undone.')) return;
    setActionPending(id + '-del');
    try {
      await adminDeleteDonation(id);
      setDonations((prev) => prev.filter((d) => d.id !== id));
      auditLog('donation_delete', 'donation', id, 'Deleted');
    } finally { setActionPending(null); }
  };

  const handleFlagSubmit = async () => {
    if (!flagTarget || !flagReason.trim()) return;
    setActionPending(flagTarget.id + '-flag');
    try {
      await flagDonation(flagTarget.id, flagReason.trim());
      setDonations((prev) => prev.map((d) => d.id === flagTarget.id ? { ...d, flagged: true, flagReason: flagReason.trim() } : d));
      auditLog('donation_flag', 'donation', flagTarget.id, `Flagged: ${flagReason.trim()}`);
    } finally { setActionPending(null); setFlagTarget(null); setFlagReason(''); }
  };

  const handleUnflag = async (id: string) => {
    setActionPending(id + '-unflag');
    try {
      await unflagDonation(id);
      setDonations((prev) => prev.map((d) => d.id === id ? { ...d, flagged: false, flagReason: '' } : d));
      auditLog('donation_unflag', 'donation', id, 'Flag removed');
    } finally { setActionPending(null); }
  };

  // ── Announcement handlers ─────────────────────────────────────────────────
  const handleSendAnnouncement = async () => {
    if (!announceTitle.trim() || !announceMsg.trim() || !user) return;
    setAnnounceSending(true);
    try {
      const id = await sendAnnouncement(announceTitle.trim(), announceMsg.trim(), user.name || user.email);
      const newA: Announcement = {
        id, title: announceTitle.trim(), message: announceMsg.trim(),
        adminName: user.name || user.email, active: true, createdAt: new Date(),
      };
      setAnnouncements((prev) => [newA, ...prev]);
      auditLog('announcement_send', 'settings', id, `Title: ${announceTitle.trim()}`);
      setAnnounceTitle(''); setAnnounceMsg('');
      setAnnounceSent(true);
      setTimeout(() => setAnnounceSent(false), 3000);
    } finally { setAnnounceSending(false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    auditLog('announcement_delete', 'settings', id, 'Announcement deleted');
  };

  const handleToggleAnnouncement = async (id: string, active: boolean) => {
    await toggleAnnouncement(id, !active);
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, active: !active } : a));
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
    } finally { setSettingsSaving(false); }
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
        <div className="rounded-2xl bg-white p-10 shadow text-center">
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
    verifiedUsers:      users.filter((u) => u.isVerified).length,
    totalDonations:     donations.length,
    activeDonations:    donations.filter((d) => d.status === 'active').length,
    completedDonations: donations.filter((d) => d.status === 'completed').length,
    rejectedDonations:  donations.filter((d) => d.status === 'rejected').length,
    flaggedDonations:   donations.filter((d) => d.flagged).length,
    featuredDonations:  donations.filter((d) => d.featured).length,
    totalViews:         donations.reduce((sum, d) => sum + d.viewCount, 0),
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
  });

  const filteredDonations = donations.filter((d) => {
    if (donationFilter !== 'all' && d.status !== donationFilter) return false;
    if (donationSearch) {
      const q = donationSearch.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.location.city.toLowerCase().includes(q) || d.userId.toLowerCase().includes(q);
    }
    return true;
  });

  const flaggedDonations = donations.filter((d) => d.flagged);

  const filteredFlaggedDonations = flaggedDonations.filter((d) => {
    const q = moderationSearch.toLowerCase();
    const matchQ = !q || d.title.toLowerCase().includes(q) || (d.flagReason ?? '').toLowerCase().includes(q) || d.location.city.toLowerCase().includes(q);
    const matchReason = !moderationReasonFilter || (d.flagReason ?? '').toLowerCase().includes(moderationReasonFilter.toLowerCase());
    return matchQ && matchReason;
  });

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.toLowerCase();
    return !q || l.action.toLowerCase().includes(q) || l.adminName.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
  });

  const activeAnnouncements = announcements.filter((a) => a.active).length;

  return (
    <div className="min-h-screen bg-gray-100 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Flag modal */}
      {flagTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-1">Flag Donation</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{flagTarget.title}</p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason for flagging…"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { setFlagTarget(null); setFlagReason(''); }} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button>
              <button onClick={handleFlagSubmit} disabled={!flagReason.trim() || actionPending === flagTarget.id + '-flag'} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40">Flag</button>
            </div>
          </div>
        </div>
      )}

      {viewUser && (
        <UserModal
          u={viewUser} currentUid={user.uid} actionPending={actionPending}
          onClose={() => setViewUser(null)}
          onStatus={handleUserStatus}
          onRole={handleUserRole}
          onVerify={handleUserVerify}
          onDelete={handleDeleteUser}
        />
      )}

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto lg:h-auto lg:min-h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarNav
            tab={tab} setTab={setTab} setSidebarOpen={setSidebarOpen}
            userName={user.name || user.email} userEmail={user.email} userImage={user.profileImage}
            userCount={users.length} donationCount={donations.length}
            featuredCount={stats.featuredDonations} flaggedCount={stats.flaggedDonations}
            announcementCount={activeAnnouncements}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100" aria-label="Open menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="font-bold text-gray-900">⚡ Super Admin</span>
            {stats.flaggedDonations > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">{stats.flaggedDonations} flagged</span>
            )}
          </header>

          {/* Desktop hero header */}
          <div className="hidden lg:block bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-6 py-5 border-b border-gray-700">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-0.5">
                  <h1 className="text-xl font-bold">
                    {getGreeting()}, {user.name.split(' ')[0]}! 👋
                  </h1>
                  <span className="rounded-full bg-teal-500/20 border border-teal-400/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-300 uppercase tracking-wider">⚡ Super Admin</span>
                  {stats.flaggedDonations > 0 && (
                    <button onClick={() => setTab('moderation')} className="rounded-full bg-red-500/20 border border-red-400/30 px-2.5 py-0.5 text-[10px] font-bold text-red-300 animate-pulse hover:bg-red-500/30 transition">
                      ⚠️ {stats.flaggedDonations} need review
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {NAV_ITEMS.find((n) => n.tab === tab)?.icon} {NAV_ITEMS.find((n) => n.tab === tab)?.label} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-6">
                {[
                  { label: 'Users', val: stats.totalUsers, color: 'text-teal-400' },
                  { label: 'Donations', val: stats.totalDonations, color: 'text-blue-400' },
                  { label: 'Completed', val: stats.completedDonations, color: 'text-green-400' },
                  { label: 'Flagged', val: stats.flaggedDonations, color: stats.flaggedDonations > 0 ? 'text-red-400' : 'text-gray-500' },
                ].map((s) => (
                  <div key={s.label} className="text-center hidden xl:block">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
                <div className="flex gap-2 ml-2">
                  <button onClick={() => setDataLoaded(false)} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition">⟳ Refresh</button>
                  <button onClick={() => setTab('announcements')} className="rounded-lg bg-orange-400 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition">📢 Announce</button>
                  <button
                    onClick={() => exportCSV('donow-full-export.csv', [
                      ...users.map((u) => ({ Type: 'User', Name: u.name, Email: u.email, City: u.city, Role: u.role, Status: u.status, Donations: u.donationCount })),
                      ...donations.map((d) => ({ Type: 'Donation', Name: d.title, Email: d.userId, City: d.location.city, Role: d.status, Status: d.flagged ? 'Flagged' : 'Clean', Donations: d.viewCount })),
                    ])}
                    className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    ↓ Export All
                  </button>
                </div>
              </div>
            </div>
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
                {/* Attention banner */}
                {stats.flaggedDonations > 0 && (
                  <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="font-semibold text-red-800">{stats.flaggedDonations} donation{stats.flaggedDonations !== 1 ? 's' : ''} need your review</p>
                      <p className="text-xs text-red-500">Flagged content is waiting in the Moderation queue.</p>
                    </div>
                    <button onClick={() => setTab('moderation')} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition flex-shrink-0">Review Now</button>
                  </div>
                )}

                {/* Primary stat cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Total Users',     value: stats.totalUsers,         color: 'from-teal-500 to-teal-600',   icon: '👥', tab: 'users' as Tab },
                    { label: 'Total Donations', value: stats.totalDonations,     color: 'from-blue-500 to-blue-600',   icon: '📦', tab: 'donations' as Tab },
                    { label: 'Completed',       value: stats.completedDonations, color: 'from-green-500 to-green-600', icon: '✅', tab: 'donations' as Tab },
                    { label: 'Total Views',     value: stats.totalViews,         color: 'from-purple-500 to-purple-600', icon: '👁', tab: 'analytics' as Tab },
                  ].map((s) => (
                    <button key={s.label} onClick={() => setTab(s.tab)} className={`rounded-2xl bg-gradient-to-br ${s.color} p-5 text-white shadow-lg hover:shadow-xl transition hover:-translate-y-0.5 text-left`}>
                      <p className="text-3xl mb-1">{s.icon}</p>
                      <p className="text-3xl font-extrabold">{s.value.toLocaleString()}</p>
                      <p className="mt-1 text-sm text-white/80">{s.label}</p>
                    </button>
                  ))}
                </div>

                {/* Secondary stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Active Users',      value: stats.activeUsers,       color: 'text-green-600', tab: 'users' as Tab },
                    { label: 'Verified Users',     value: stats.verifiedUsers,    color: 'text-teal-600',  tab: 'users' as Tab },
                    { label: 'Suspended/Banned',   value: stats.bannedUsers,      color: 'text-red-600',   tab: 'users' as Tab },
                    { label: 'Flagged',            value: stats.flaggedDonations, color: stats.flaggedDonations > 0 ? 'text-orange-500' : 'text-gray-400', tab: 'moderation' as Tab },
                  ].map((s) => (
                    <button key={s.label} onClick={() => setTab(s.tab)} className="rounded-xl bg-white p-4 shadow text-center hover:shadow-md transition">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="mt-1 text-xs text-gray-500">{s.label}</p>
                    </button>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl bg-white p-5 shadow">
                  <h2 className="mb-4 font-semibold text-gray-800">⚡ Quick Actions</h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '📢 Send Announcement', action: () => setTab('announcements'), style: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                      { label: '⭐ Manage Featured',    action: () => setTab('featured'),      style: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
                      { label: '👥 View All Users',     action: () => setTab('users'),         style: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
                      { label: '📈 Analytics',          action: () => setTab('analytics'),     style: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                      { label: '🔐 Audit Logs',         action: () => setTab('logs'),          style: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                      { label: '⚙️ Settings',           action: () => setTab('settings'),      style: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                    ].map((qa) => (
                      <button key={qa.label} onClick={qa.action} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${qa.style}`}>{qa.label}</button>
                    ))}
                  </div>
                </div>

                {/* Platform Health */}
                <div className="rounded-2xl bg-white p-5 shadow">
                  <h2 className="mb-4 font-semibold text-gray-800">🏥 Platform Health</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Moderation Queue', ok: stats.flaggedDonations === 0, good: 'All clear ✓', bad: `${stats.flaggedDonations} items need review` },
                      { label: 'User Base', ok: stats.bannedUsers < stats.totalUsers * 0.1, good: 'Healthy ratio', bad: 'High suspension rate' },
                      { label: 'Donation Activity', ok: stats.activeDonations > 0, good: `${stats.activeDonations} live donations`, bad: 'No active donations' },
                    ].map((h) => (
                      <div key={h.label} className={`rounded-xl border-2 p-4 ${h.ok ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg ${h.ok ? '' : 'animate-pulse'}`}>{h.ok ? '🟢' : '🟡'}</span>
                          <p className="text-sm font-semibold text-gray-800">{h.label}</p>
                        </div>
                        <p className={`text-xs ${h.ok ? 'text-green-700' : 'text-orange-700'}`}>{h.ok ? h.good : h.bad}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-800">Recent Users</h2>
                      <button onClick={() => setTab('users')} className="text-xs text-teal-600 hover:underline">View all</button>
                    </div>
                    {users.slice(0, 5).map((u) => (
                      <button key={u.uid} onClick={() => setViewUser(u)} className="w-full flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition">
                        <div className="flex items-center gap-2 text-left min-w-0">
                          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {u.isVerified && <span className="text-teal-500 text-xs">✓</span>}
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>{u.status}</span>
                        </div>
                      </button>
                    ))}
                    {users.length === 0 && <p className="text-sm text-gray-400">No users yet.</p>}
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-800">Recent Donations</h2>
                      <button onClick={() => setTab('donations')} className="text-xs text-teal-600 hover:underline">View all</button>
                    </div>
                    {donations.slice(0, 5).map((d) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="min-w-0 pr-2 flex items-center gap-2">
                          {d.flagged && <span className="text-xs text-orange-500 flex-shrink-0">⚠️</span>}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">{d.title}</p>
                            <p className="text-xs text-gray-400">{d.location.city} · {d.viewCount} views</p>
                          </div>
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
              <div className="rounded-2xl bg-white shadow overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <input type="text" placeholder="Search name, email or city…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    className="flex-1 min-w-[180px] max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                  <span className="text-xs text-gray-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => exportCSV('users.csv', filteredUsers.map((u) => ({
                    Name: u.name, Email: u.email, Phone: u.phone, City: u.city, State: u.state,
                    Role: u.role, Status: u.status, Verified: u.isVerified ? 'Yes' : 'No',
                    Donations: u.donationCount, Received: u.receivedCount, Rating: u.rating, Joined: fmt(u.createdAt),
                  })))} className="ml-auto rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition">
                    ↓ Export CSV
                  </button>
                </div>

                {selectedUsers.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 bg-teal-50 border-b border-teal-200 px-4 py-2">
                    <span className="text-sm font-semibold text-teal-800">{selectedUsers.size} selected</span>
                    <button onClick={() => handleBulkAction('suspend')}      disabled={bulkPending} className="rounded bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40">Suspend</button>
                    <button onClick={() => handleBulkAction('ban')}          disabled={bulkPending} className="rounded bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Ban</button>
                    <button onClick={() => handleBulkAction('restore')}      disabled={bulkPending} className="rounded bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Restore</button>
                    <button onClick={() => handleBulkAction('verify')}       disabled={bulkPending} className="rounded bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-200 disabled:opacity-40">Verify All</button>
                    <button onClick={() => handleBulkAction('make-admin')}   disabled={bulkPending} className="rounded bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-40">Make Admin</button>
                    <button onClick={() => handleBulkAction('remove-admin')} disabled={bulkPending} className="rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-40">Remove Admin</button>
                    <button onClick={() => setSelectedUsers(new Set())} className="ml-auto text-xs text-gray-500 hover:text-gray-800">✕ Clear</button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">
                          <input type="checkbox"
                            checked={filteredUsers.length > 0 && filteredUsers.every((u) => u.uid === user.uid || selectedUsers.has(u.uid))}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedUsers(new Set(filteredUsers.filter((u) => u.uid !== user.uid).map((u) => u.uid)));
                              else setSelectedUsers(new Set());
                            }} className="rounded" />
                        </th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3 hidden sm:table-cell">City</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Donations</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 hidden md:table-cell">Verified</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.uid} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {u.uid !== user.uid && (
                              <input type="checkbox" checked={selectedUsers.has(u.uid)}
                                onChange={(e) => {
                                  const next = new Set(selectedUsers);
                                  if (e.target.checked) next.add(u.uid); else next.delete(u.uid);
                                  setSelectedUsers(next);
                                }} className="rounded" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setViewUser(u)} className="text-left hover:text-teal-600 transition">
                              <p className="font-semibold text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{u.city || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{u.donationCount}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[u.status] ?? ''}`}>{u.status}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`text-xs font-semibold ${u.isVerified ? 'text-teal-600' : 'text-gray-400'}`}>{u.isVerified ? '✓ Yes' : '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {u.uid === user.uid ? (
                              <span className="text-xs text-gray-400">You</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => setViewUser(u)} className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">View</button>
                                {u.status === 'active' ? (
                                  <button onClick={() => handleUserStatus(u.uid, 'suspended')} disabled={actionPending === u.uid} className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-40">Suspend</button>
                                ) : (
                                  <button onClick={() => handleUserStatus(u.uid, 'active')} disabled={actionPending === u.uid} className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Restore</button>
                                )}
                                <button onClick={() => handleUserVerify(u.uid, !u.isVerified)} disabled={actionPending === u.uid + '-verify'} className="rounded bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-200 disabled:opacity-40">
                                  {u.isVerified ? 'Unverify' : 'Verify'}
                                </button>
                                <button onClick={() => handleDeleteUser(u.uid)} disabled={!!actionPending} className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── DONATIONS ── */}
            {!dataLoading && tab === 'donations' && (
              <div className="rounded-2xl bg-white shadow">
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <input type="text" placeholder="Search title or city…" value={donationSearch} onChange={(e) => setDonationSearch(e.target.value)}
                    className="flex-1 min-w-[160px] max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Status:</span>
                  {(['all', 'active', 'completed', 'rejected'] as const).map((s) => (
                    <button key={s} onClick={() => setDonationFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${donationFilter === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {s} ({s === 'all' ? donations.length : donations.filter((d) => d.status === s).length})
                    </button>
                  ))}
                  <button onClick={() => exportCSV('donations.csv', filteredDonations.map((d) => ({
                    Title: d.title, Category: getCategoryName(d.category), City: d.location.city,
                    Status: d.status, Featured: d.featured ? 'Yes' : 'No', Flagged: d.flagged ? 'Yes' : 'No',
                    Views: d.viewCount, Created: fmt(d.createdAt),
                  })))} className="ml-auto rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition">↓ Export CSV</button>
                </div>
                <div className="divide-y">
                  {filteredDonations.map((d) => (
                    <div key={d.id} className={`flex items-start gap-4 p-4 hover:bg-gray-50 ${d.flagged ? 'bg-red-50' : ''}`}>
                      {d.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.images[0]} alt={d.title} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover bg-gray-100" />
                      ) : (
                        <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/donations/${d.id}`} className="font-semibold text-gray-900 hover:text-teal-600 truncate">{d.title}</Link>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[d.status] ?? ''}`}>{d.status}</span>
                          {d.flagged && <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">⚠️ Flagged</span>}
                          {d.featured && <span className="rounded px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800">⭐ Featured</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{getCategoryName(d.category)} · {d.location.city} · {d.viewCount} views · {fmt(d.createdAt)}</p>
                        {d.flagged && d.flagReason && <p className="mt-0.5 text-xs text-red-600">Flag: {d.flagReason}</p>}
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap gap-1">
                        {d.status !== 'active'   && <button onClick={() => handleDonationStatus(d.id, 'active')}   disabled={actionPending === d.id} className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">Approve</button>}
                        {d.status !== 'rejected' && <button onClick={() => handleDonationStatus(d.id, 'rejected')} disabled={actionPending === d.id} className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Reject</button>}
                        {d.flagged
                          ? <button onClick={() => handleUnflag(d.id)} disabled={actionPending === d.id + '-unflag'} className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-500 hover:bg-orange-200 disabled:opacity-40">Unflag</button>
                          : <button onClick={() => setFlagTarget(d)} className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-500 hover:bg-orange-200">Flag</button>
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
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Pending Review', val: flaggedDonations.length, color: flaggedDonations.length > 0 ? 'text-orange-500' : 'text-gray-400' },
                    { label: 'Rejected Total', val: donations.filter((d) => d.status === 'rejected').length, color: 'text-red-600' },
                    { label: 'Clean Active',   val: donations.filter((d) => d.status === 'active' && !d.flagged).length, color: 'text-green-600' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white p-4 shadow text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow">
                  <input type="text" placeholder="Search by title, reason, or city…" value={moderationSearch} onChange={(e) => setModerationSearch(e.target.value)}
                    className="flex-1 min-w-[180px] max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                  <input type="text" placeholder="Filter by reason…" value={moderationReasonFilter} onChange={(e) => setModerationReasonFilter(e.target.value)}
                    className="min-w-[140px] max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                  {(moderationSearch || moderationReasonFilter) && (
                    <button onClick={() => { setModerationSearch(''); setModerationReasonFilter(''); }} className="text-xs text-gray-500 hover:text-gray-800">✕ Clear</button>
                  )}
                  <span className="ml-auto self-center text-xs text-gray-500">{filteredFlaggedDonations.length} of {flaggedDonations.length} flagged</span>
                </div>
                {flaggedDonations.length === 0 ? (
                  <div className="rounded-2xl bg-white py-16 shadow text-center">
                    <p className="text-5xl mb-3">✅</p>
                    <p className="font-semibold text-gray-700">Queue is clear</p>
                    <p className="text-sm text-gray-400 mt-1">No flagged donations to review.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white shadow divide-y overflow-hidden">
                    {filteredFlaggedDonations.map((d) => (
                      <div key={d.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                        {d.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.images[0]} alt={d.title} className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Link href={`/donations/${d.id}`} className="font-semibold text-gray-900 hover:text-teal-600 block truncate">{d.title}</Link>
                          <p className="text-xs text-gray-500 mt-0.5">{getCategoryName(d.category)} · {d.location.city} · {fmt(d.createdAt)}</p>
                          {d.flagReason && (
                            <p className="mt-1 text-xs bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700">
                              <span className="font-semibold">Flag reason:</span> {d.flagReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1.5">
                          <button onClick={() => handleUnflag(d.id)} disabled={actionPending === d.id + '-unflag'} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200 disabled:opacity-40">✓ Approve</button>
                          <button onClick={async () => {
                            setActionPending(d.id + '-dismiss');
                            try {
                              await unflagDonation(d.id);
                              setDonations((prev) => prev.map((x) => x.id === d.id ? { ...x, flagged: false, flagReason: '' } : x));
                              auditLog('donation_dismiss', 'donation', d.id, 'Flag dismissed');
                            } finally { setActionPending(null); }
                          }} disabled={actionPending === d.id + '-dismiss'} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40">Dismiss</button>
                          <button onClick={() => handleDonationStatus(d.id, 'rejected')} disabled={actionPending === d.id} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40">Reject</button>
                          <button onClick={() => handleDeleteDonation(d.id)} disabled={actionPending === d.id + '-del'} className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-40">Delete</button>
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
                  <p className="text-sm text-gray-500">Pinned donations appear first in the homepage &ldquo;Featured Donations&rdquo; section. Current: <span className="font-semibold text-yellow-600">{stats.featuredDonations} pinned</span></p>
                </div>
                {donations.filter((d) => d.status === 'active').length === 0 ? (
                  <div className="rounded-xl bg-white py-16 shadow text-center text-gray-400">No active donations yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {donations.filter((d) => d.status === 'active')
                      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.viewCount - a.viewCount)
                      .map((d) => (
                        <div key={d.id} className={`rounded-2xl bg-white shadow overflow-hidden transition ${d.featured ? 'ring-2 ring-yellow-400' : ''}`}>
                          <div className="h-36 bg-gray-100 bg-cover bg-center relative" style={{ backgroundImage: d.images[0] ? `url(${d.images[0]})` : undefined }}>
                            {d.featured && <span className="absolute top-2 left-2 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-yellow-900">⭐ Featured</span>}
                            <span className="absolute top-2 right-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">{d.viewCount} views</span>
                          </div>
                          <div className="p-3">
                            <p className="truncate font-semibold text-gray-900 text-sm">{d.title}</p>
                            <p className="text-xs text-gray-500">{getCategoryName(d.category)} · {d.location.city}</p>
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => handleToggleFeatured(d.id, d.featured ?? false)} disabled={actionPending === d.id + '-feat'}
                                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${d.featured ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                {actionPending === d.id + '-feat' ? '…' : d.featured ? 'Unpin' : '⭐ Pin'}
                              </button>
                              <Link href={`/donations/${d.id}`} className="rounded-lg bg-teal-50 px-2 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition">View</Link>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: 'Total Users',     value: stats.totalUsers,         color: 'text-teal-600',    icon: '👥' },
                    { label: 'Verified Users',  value: stats.verifiedUsers,      color: 'text-teal-500',    icon: '✅' },
                    { label: 'Total Donations', value: stats.totalDonations,     color: 'text-indigo-600',  icon: '📦' },
                    { label: 'Active',          value: stats.activeDonations,    color: 'text-blue-600',    icon: '🟢' },
                    { label: 'Completed',       value: stats.completedDonations, color: 'text-green-600',   icon: '🏁' },
                    { label: 'Total Views',     value: stats.totalViews,         color: 'text-purple-600',  icon: '👁' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-white p-4 shadow text-center">
                      <p className="text-xl mb-0.5">{s.icon}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => exportCSV('analytics-donations.csv', donations.map((d) => ({ Title: d.title, Category: getCategoryName(d.category), City: d.location.city, Status: d.status, Featured: d.featured ? 'Yes' : 'No', Flagged: d.flagged ? 'Yes' : 'No', Views: d.viewCount, Created: fmt(d.createdAt) })))}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow hover:bg-gray-50 transition">↓ Donations CSV</button>
                  <button onClick={() => exportCSV('analytics-users.csv', users.map((u) => ({ Name: u.name, City: u.city, State: u.state, Role: u.role, Status: u.status, Verified: u.isVerified ? 'Yes' : 'No', Donations: u.donationCount, Received: u.receivedCount, Rating: u.rating, Joined: fmt(u.createdAt) })))}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow hover:bg-gray-50 transition">↓ Users CSV</button>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow">
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
                            <div className="flex-1 rounded-full bg-gray-100 h-5 overflow-hidden">
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
                  <div className="rounded-2xl bg-white p-5 shadow">
                    <h2 className="mb-4 font-semibold text-gray-800">Donations by Status</h2>
                    {(['active', 'completed', 'rejected'] as const).map((s) => {
                      const count = donations.filter((d) => d.status === s).length;
                      const pct = donations.length ? Math.round((count / donations.length) * 100) : 0;
                      const colors: Record<string, string> = { active: 'bg-green-500', completed: 'bg-blue-500', rejected: 'bg-red-400' };
                      return (
                        <div key={s} className="mb-2 flex items-center gap-3">
                          <span className="w-20 flex-shrink-0 text-right text-xs capitalize text-gray-600">{s}</span>
                          <div className="flex-1 rounded-full bg-gray-100 h-5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${colors[s]}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-xs font-semibold text-gray-700">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-2xl bg-white p-5 shadow">
                    <h2 className="mb-4 font-semibold text-gray-800">Top Cities</h2>
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
                              <div className="flex-1 rounded-full bg-gray-100 h-5 overflow-hidden">
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
              </div>
            )}

            {/* ── ANNOUNCEMENTS ── */}
            {!dataLoading && tab === 'announcements' && (
              <div className="space-y-6 max-w-2xl">
                {/* Compose */}
                <div className="rounded-2xl bg-white p-6 shadow">
                  <h2 className="mb-4 font-semibold text-gray-800 text-base">📢 Send New Announcement</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Title</label>
                      <input
                        value={announceTitle}
                        onChange={(e) => setAnnounceTitle(e.target.value)}
                        placeholder="e.g. New feature: location-based browsing"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Message</label>
                      <textarea
                        value={announceMsg}
                        onChange={(e) => setAnnounceMsg(e.target.value)}
                        rows={4}
                        placeholder="Write your announcement here…"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSendAnnouncement}
                        disabled={announceSending || !announceTitle.trim() || !announceMsg.trim()}
                        className="rounded-lg bg-orange-400 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 transition"
                      >
                        {announceSending ? 'Sending…' : '📢 Send Announcement'}
                      </button>
                      {announceSent && <span className="text-sm text-green-600 font-semibold">✓ Sent!</span>}
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-3">
                  <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Past Announcements ({announcements.length})</h2>
                  {!announcementsLoaded ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
                  ) : announcements.length === 0 ? (
                    <div className="rounded-2xl bg-white py-12 shadow text-center text-gray-400">No announcements sent yet.</div>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className={`rounded-2xl bg-white p-5 shadow border-l-4 ${a.active ? 'border-teal-500' : 'border-gray-300'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 truncate">{a.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {a.active ? 'Active' : 'Hidden'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{a.message}</p>
                            <p className="text-xs text-gray-400">By {a.adminName} · {fmt(a.createdAt)} at {fmtTime(a.createdAt)}</p>
                          </div>
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button onClick={() => handleToggleAnnouncement(a.id, a.active)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${a.active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                              {a.active ? 'Hide' : 'Activate'}
                            </button>
                            <button onClick={() => handleDeleteAnnouncement(a.id)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 transition">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
                    {/* ─ Images & Branding ─ */}
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Images &amp; Branding</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <ImageUploadCard
                      title="🖼 Hero Background Image"
                      desc="Large background on the homepage hero section."
                      badge="Live on site"
                      url={settingsData.heroImageUrl ?? ''}
                      previewNode={
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center px-4">
                          <div>
                            <p className="text-white font-bold drop-shadow text-sm">Donate unused items.</p>
                            <p className="text-orange-300 font-bold drop-shadow text-sm">Make someone smile today.</p>
                          </div>
                        </div>
                      }
                      onChange={(url) => setSettingsData({ ...settingsData, heroImageUrl: url })}
                    />

                    <ImageUploadCard
                      title="📸 OG / Social Share Image"
                      desc="Shown when the site is shared on WhatsApp, Twitter, Facebook, etc."
                      url={settingsData.ogImageUrl ?? ''}
                      onChange={(url) => setSettingsData({ ...settingsData, ogImageUrl: url })}
                    />

                    <ImageUploadCard
                      title="🏷 Platform Logo"
                      desc="Brand logo. Used in emails and branding materials."
                      url={settingsData.logoUrl ?? ''}
                      onChange={(url) => setSettingsData({ ...settingsData, logoUrl: url })}
                    />

                    {/* ─ Homepage Content ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Homepage Content</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <BadgesEditor
                      title="🏅 Trust Bar Badges"
                      desc="The small badges shown below the hero. Toggle, rename, or add new ones."
                      badges={settingsData.trustBadges ?? []}
                      onChange={(trustBadges) => setSettingsData({ ...settingsData, trustBadges })}
                    />

                    <HeroStatsEditor
                      stats={settingsData.heroStats ?? []}
                      onChange={(heroStats) => setSettingsData({ ...settingsData, heroStats })}
                    />

                    {/* ─ Platform Info ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Platform Info</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
                      {[
                        { key: 'platformName', label: 'Platform Name', type: 'text', placeholder: 'Donow' },
                        { key: 'tagline',      label: 'Tagline',       type: 'text', placeholder: 'Give More. Waste Less.' },
                        { key: 'supportEmail', label: 'Support Email', type: 'email', placeholder: 'admin@donow.co.in' },
                      ].map(({ key, label, type, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">{label}</label>
                          <input type={type} value={String(settingsData[key as keyof PlatformSettings] ?? '')}
                            onChange={(e) => setSettingsData({ ...settingsData, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                      ))}
                    </div>

                    {/* ─ App Download Links ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">App Download Links</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
                      <p className="text-xs text-gray-500">These URLs are used in the &ldquo;Also available on mobile&rdquo; section on the homepage.</p>
                      {[
                        { key: 'androidApkUrl', label: '🤖 Android APK URL', placeholder: '/donow.apk  or  https://...' },
                        { key: 'iosAppUrl',     label: '🍎 iOS App Store URL', placeholder: 'https://apps.apple.com/...' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">{label}</label>
                          <input type="url" value={String(settingsData[key as keyof PlatformSettings] ?? '')}
                            onChange={(e) => setSettingsData({ ...settingsData, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                      ))}
                    </div>

                    {/* ─ Contact & Social ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Contact &amp; Social</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
                      {[
                        { key: 'contactPhone',   label: 'Contact Phone / WhatsApp',      placeholder: '+91 98765 43210', type: 'tel'  },
                        { key: 'whatsappNumber', label: 'WhatsApp Number (digits only)', placeholder: '919876543210', type: 'tel' },
                        { key: 'facebookUrl',    label: '📘 Facebook URL',                placeholder: 'https://facebook.com/donow', type: 'url' },
                        { key: 'instagramUrl',   label: '📸 Instagram URL',               placeholder: 'https://instagram.com/donow', type: 'url' },
                        { key: 'twitterUrl',     label: '✖ Twitter / X URL',             placeholder: 'https://x.com/donow', type: 'url' },
                        { key: 'youtubeUrl',     label: '▶ YouTube URL',                  placeholder: 'https://youtube.com/@donow', type: 'url' },
                        { key: 'linkedinUrl',    label: '💼 LinkedIn URL',                placeholder: 'https://linkedin.com/company/donow', type: 'url' },
                        { key: 'telegramUrl',    label: '✈ Telegram URL',                 placeholder: 'https://t.me/donow', type: 'url' },
                        { key: 'pinterestUrl',   label: '📌 Pinterest URL',               placeholder: 'https://pinterest.com/donow', type: 'url' },
                        { key: 'threadsUrl',     label: '🧵 Threads URL',                 placeholder: 'https://threads.net/@donow', type: 'url' },
                      ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">{label}</label>
                          <input type={type} value={String(settingsData[key as keyof PlatformSettings] ?? '')}
                            onChange={(e) => setSettingsData({ ...settingsData, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                      ))}
                    </div>

                    {/* ─ Tracking & Pixels ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Tracking &amp; Pixels</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
                      <p className="text-xs text-gray-500">
                        Paste your IDs and they&apos;ll load on every public page. Leave a field blank to disable that integration.
                      </p>
                      {[
                        { key: 'googleAnalyticsId',  label: '📊 Google Analytics 4 — Measurement ID', placeholder: 'G-XXXXXXXXXX' },
                        { key: 'googleTagManagerId', label: '🏷 Google Tag Manager — Container ID',   placeholder: 'GTM-XXXXXXX' },
                        { key: 'metaPixelId',        label: '📘 Meta (Facebook) Pixel — ID',          placeholder: '1234567890123456' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">{label}</label>
                          <input type="text" value={String(settingsData[key as keyof PlatformSettings] ?? '')}
                            onChange={(e) => setSettingsData({ ...settingsData, [key]: e.target.value.trim() })}
                            placeholder={placeholder}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">🧩 Custom &lt;head&gt; Script (advanced)</label>
                        <textarea
                          value={String(settingsData.customHeadScript ?? '')}
                          onChange={(e) => setSettingsData({ ...settingsData, customHeadScript: e.target.value })}
                          rows={5}
                          placeholder={'<!-- Paste any other tracking snippet here, e.g. TikTok Pixel,\n     LinkedIn Insight Tag, Hotjar. Include the full <script>…</script>. -->'}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                        />
                        <p className="mt-1 text-[11px] text-amber-600">
                          ⚠ This runs as raw code on every visitor&apos;s browser. Only paste snippets from sources you trust.
                        </p>
                      </div>
                    </div>

                    {/* ─ Feature Toggles ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Feature Toggles</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
                      {([
                        { key: 'messagingEnabled',              label: 'Messaging',                    desc: 'Allow users to message each other' },
                        { key: 'ratingsEnabled',                label: 'Ratings',                      desc: 'Allow users to rate donors' },
                        { key: 'savedDonationsEnabled',         label: 'Save Donations',               desc: 'Allow users to bookmark donations' },
                        { key: 'requireVerificationForPosting', label: 'Require verification to post', desc: 'Users must be verified before posting' },
                      ] as { key: keyof PlatformSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                        <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{label}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                          <div onClick={() => setSettingsData({ ...settingsData, [key]: !settingsData[key] })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${settingsData[key] ? 'bg-teal-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settingsData[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </label>
                      ))}
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Max Donations per User per Day</label>
                        <input type="number" min={1} max={50} value={settingsData.maxDonationsPerDay}
                          onChange={(e) => setSettingsData({ ...settingsData, maxDonationsPerDay: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-28 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                    </div>

                    {/* ─ Maintenance ─ */}
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Maintenance</p>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
                      <label className="flex items-center justify-between gap-4 cursor-pointer">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">🔧 Maintenance Mode</p>
                          <p className="text-xs text-gray-500">Show a banner to all users (admins still have full access)</p>
                        </div>
                        <div onClick={() => setSettingsData({ ...settingsData, maintenanceMode: !settingsData.maintenanceMode })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${settingsData.maintenanceMode ? 'bg-orange-400' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settingsData.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                      </label>
                      {settingsData.maintenanceMode && (
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Maintenance Message</label>
                          <input value={settingsData.maintenanceMessage} onChange={(e) => setSettingsData({ ...settingsData, maintenanceMessage: e.target.value })}
                            placeholder="We'll be back soon. Thanks for your patience!"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                      )}
                    </div>

                    {/* ─ Save ─ */}
                    <div className="flex items-center gap-3 pb-8">
                      <button onClick={handleSaveSettings} disabled={settingsSaving}
                        className="rounded-lg bg-teal-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition">
                        {settingsSaving ? 'Saving…' : '💾 Save All Settings'}
                      </button>
                      {settingsSaved && <span className="text-sm text-green-600 font-semibold">✓ Saved successfully!</span>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── AUDIT LOGS ── */}
            {!dataLoading && tab === 'logs' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white p-4 shadow">
                  <input type="text" placeholder="Search by action, admin, or details…" value={logSearch} onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {logsLoading ? (
                  <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
                ) : filteredLogs.length === 0 ? (
                  <div className="rounded-2xl bg-white py-16 shadow text-center">
                    <p className="text-4xl mb-3">🔐</p>
                    <p className="font-semibold text-gray-700">{logSearch ? 'No logs match your search' : 'No admin actions logged yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">Every admin action is recorded here for accountability.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white shadow overflow-hidden">
                    <div className="divide-y">
                      {filteredLogs.map((l) => {
                        const actionColors: Record<string, string> = {
                          user_status: 'bg-yellow-100 text-yellow-800', user_role: 'bg-purple-100 text-purple-700',
                          user_verify: 'bg-teal-100 text-teal-700', user_delete: 'bg-red-100 text-red-700',
                          donation_status: 'bg-blue-100 text-blue-700', donation_delete: 'bg-red-100 text-red-700',
                          donation_flag: 'bg-orange-100 text-orange-600', donation_unflag: 'bg-green-100 text-green-700',
                          donation_featured: 'bg-yellow-100 text-yellow-800', update_settings: 'bg-gray-100 text-gray-700',
                          announcement_send: 'bg-orange-100 text-orange-700', announcement_delete: 'bg-red-100 text-red-700',
                        };
                        const color = actionColors[l.action] ?? 'bg-gray-100 text-gray-600';
                        return (
                          <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                            <span className={`mt-0.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${color}`}>
                              {l.action.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate">{l.details}</p>
                              <p className="text-xs text-gray-500 mt-0.5">by <span className="font-semibold">{l.adminName}</span>{l.targetId && <> · <span className="font-mono text-[10px]">{l.targetId.slice(0, 12)}…</span></>}</p>
                            </div>
                            <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">{fmt(l.createdAt)} {fmtTime(l.createdAt)}</span>
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
