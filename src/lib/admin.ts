import { auth, db } from './firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AdminLog, Donation, PlatformSettings, User } from '@/types';

type FirestoreTimestamp = { toDate: () => Date };

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value)
    return (value as FirestoreTimestamp).toDate();
  return new Date();
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((d) => {
      const data = d.data() as Partial<User>;
      return {
        uid: d.id,
        email: data.email ?? '',
        phone: data.phone ?? '',
        name: data.name ?? '',
        profileImage: data.profileImage,
        bio: data.bio,
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        pincode: data.pincode ?? '',
        savedDonations: data.savedDonations,
        isVerified: data.isVerified ?? false,
        donationCount: data.donationCount ?? 0,
        receivedCount: data.receivedCount ?? 0,
        rating: data.rating ?? 0,
        role: data.role ?? 'user',
        status: data.status ?? 'active',
        createdAt: normalizeDate(data.createdAt),
        updatedAt: normalizeDate(data.updatedAt),
      } satisfies User;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function setUserStatus(
  uid: string,
  status: User['status']
): Promise<void> {
  // Routed through the server so the Firebase Auth account is also
  // disabled/re-enabled (and tokens revoked on ban) — not just a Firestore flag.
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch('/api/admin/set-user-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid, status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Could not update user status');
  }
}

export async function setUserRole(
  uid: string,
  role: User['role']
): Promise<void> {
  // Routed through the server so only super-admin UIDs (env-pinned) can promote/demote.
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch('/api/admin/set-user-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid, role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Could not update role');
  }
}

export async function checkIsSuperAdmin(): Promise<boolean> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return false;
  const res = await fetch('/api/admin/is-super-admin', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const data = await res.json() as { isSuperAdmin?: boolean };
  return data.isSuperAdmin ?? false;
}

export async function getAllDonationsAdmin(): Promise<Donation[]> {
  const snap = await getDocs(collection(db, 'donations'));
  return snap.docs
    .map((d) => {
      const data = d.data() as Partial<Donation>;
      return {
        id: d.id,
        userId: data.userId ?? '',
        title: data.title ?? '',
        description: data.description ?? '',
        category: data.category ?? 'other',
        condition: data.condition ?? 'good',
        images: data.images ?? [],
        location: {
          address: data.location?.address ?? '',
          city: data.location?.city ?? '',
          coordinates: data.location?.coordinates,
        },
        status: data.status ?? 'active',
        featured: data.featured ?? false,
        flagged: data.flagged ?? false,
        flagReason: data.flagReason ?? '',
        viewCount: data.viewCount ?? 0,
        interestedUsers: data.interestedUsers ?? [],
        createdAt: normalizeDate(data.createdAt),
        updatedAt: normalizeDate(data.updatedAt),
      } satisfies Donation;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function setDonationStatus(
  id: string,
  status: Donation['status']
): Promise<void> {
  await updateDoc(doc(db, 'donations', id), { status, updatedAt: new Date() });
}

// Routes a destructive admin action through a server endpoint that enforces
// the admin role AND a valid two-factor session (MFA cookie).
async function adminMfaFetch(path: string, body: Record<string, unknown>): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Action failed');
  }
}

export async function adminDeleteDonation(id: string): Promise<void> {
  await adminMfaFetch('/api/admin/delete-donation', { id });
}

export async function setDonationFeatured(id: string, featured: boolean): Promise<void> {
  await updateDoc(doc(db, 'donations', id), { featured, updatedAt: new Date() });
}

export async function flagDonation(id: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'donations', id), { flagged: true, flagReason: reason, updatedAt: new Date() });
}

export async function unflagDonation(id: string): Promise<void> {
  await updateDoc(doc(db, 'donations', id), { flagged: false, flagReason: '', updatedAt: new Date() });
}

export async function logAdminAction(
  adminId: string,
  adminName: string,
  action: string,
  targetType: AdminLog['targetType'],
  targetId: string,
  details: string
): Promise<void> {
  await addDoc(collection(db, 'adminLogs'), {
    adminId,
    adminName,
    action,
    targetType,
    targetId,
    details,
    createdAt: new Date(),
  });
}

export async function getAdminLogs(): Promise<AdminLog[]> {
  const snap = await getDocs(collection(db, 'adminLogs'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        adminId: data.adminId ?? '',
        adminName: data.adminName ?? '',
        action: data.action ?? '',
        targetType: (data.targetType ?? 'user') as AdminLog['targetType'],
        targetId: data.targetId ?? '',
        details: data.details ?? '',
        createdAt: normalizeDate(data.createdAt),
      } satisfies AdminLog;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'Donow',
  tagline: 'Give More. Waste Less.',
  supportEmail: 'admin@donow.co.in',
  heroImageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1920&q=80',
  messagingEnabled: true,
  requireVerificationForPosting: false,
  maxDonationsPerDay: 5,
  ratingsEnabled: true,
  savedDonationsEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
  logoUrl: '',
  ogImageUrl: '',
  trustBadges: [
    { icon: '✅', label: 'Verified Users', enabled: true },
    { icon: '🔒', label: '100% Secure', enabled: true },
    { icon: '🚫', label: 'Zero Commission', enabled: true },
    { icon: '📱', label: 'Available on App', enabled: true },
    { icon: '🍀', label: 'Made in India', enabled: true },
    { icon: '⚡', label: 'Instant Connect', enabled: true },
  ],
  heroStats: [
    { icon: '🎁', label: 'Items Donated', val: '1,50,000+', sub: 'across India' },
    { icon: '😊', label: 'Happy Recipients', val: '1,00,000+', sub: 'lives touched' },
    { icon: '📍', label: 'Cities Covered', val: '500+', sub: '28 states' },
  ],
  androidApkUrl: '/donow.apk',
  iosAppUrl: '',
  contactPhone: '',
  instagramUrl: '',
  twitterUrl: '',
  whatsappNumber: '',
  facebookUrl: '',
  youtubeUrl: '',
  linkedinUrl: '',
  telegramUrl: '',
  pinterestUrl: '',
  threadsUrl: '',
  googleAnalyticsId: '',
  googleTagManagerId: '',
  metaPixelId: '',
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const snap = await getDoc(doc(db, 'settings', 'platform'));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  const data = snap.data();
  return {
    platformName: data.platformName ?? DEFAULT_SETTINGS.platformName,
    tagline: data.tagline ?? DEFAULT_SETTINGS.tagline,
    supportEmail: data.supportEmail ?? DEFAULT_SETTINGS.supportEmail,
    heroImageUrl: data.heroImageUrl ?? DEFAULT_SETTINGS.heroImageUrl,
    messagingEnabled: data.messagingEnabled ?? true,
    requireVerificationForPosting: data.requireVerificationForPosting ?? false,
    maxDonationsPerDay: data.maxDonationsPerDay ?? 5,
    ratingsEnabled: data.ratingsEnabled ?? true,
    savedDonationsEnabled: data.savedDonationsEnabled ?? true,
    maintenanceMode: data.maintenanceMode ?? false,
    maintenanceMessage: data.maintenanceMessage ?? '',
    logoUrl: data.logoUrl ?? '',
    ogImageUrl: data.ogImageUrl ?? '',
    trustBadges: data.trustBadges ?? DEFAULT_SETTINGS.trustBadges,
    heroStats: data.heroStats ?? DEFAULT_SETTINGS.heroStats,
    androidApkUrl: data.androidApkUrl ?? DEFAULT_SETTINGS.androidApkUrl,
    iosAppUrl: data.iosAppUrl ?? '',
    contactPhone: data.contactPhone ?? '',
    instagramUrl: data.instagramUrl ?? '',
    twitterUrl: data.twitterUrl ?? '',
    whatsappNumber: data.whatsappNumber ?? '',
    facebookUrl: data.facebookUrl ?? '',
    youtubeUrl: data.youtubeUrl ?? '',
    linkedinUrl: data.linkedinUrl ?? '',
    telegramUrl: data.telegramUrl ?? '',
    pinterestUrl: data.pinterestUrl ?? '',
    threadsUrl: data.threadsUrl ?? '',
    googleAnalyticsId: data.googleAnalyticsId ?? '',
    googleTagManagerId: data.googleTagManagerId ?? '',
    metaPixelId: data.metaPixelId ?? '',
  };
}

export async function updatePlatformSettings(settings: PlatformSettings): Promise<void> {
  await adminMfaFetch('/api/admin/settings', { settings });
}

export async function setUserVerified(uid: string, isVerified: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { isVerified, updatedAt: new Date() });
  // Mirror the verified badge to the public profile.
  await setDoc(doc(db, 'publicProfiles', uid), { isVerified }, { merge: true });
}

export async function adminDeleteUser(uid: string): Promise<void> {
  // Full server-side cascade (donations, profile, conversations, images, Auth),
  // MFA-gated — not just the /users doc.
  await adminMfaFetch('/api/admin/delete-user', { uid });
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  adminName: string;
  active: boolean;
  createdAt: Date;
}

export async function sendAnnouncement(title: string, message: string, adminName: string): Promise<string> {
  const ref = await addDoc(collection(db, 'announcements'), {
    title, message, adminName, active: true, createdAt: new Date(),
  });
  return ref.id;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(collection(db, 'announcements'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title ?? '',
        message: data.message ?? '',
        adminName: data.adminName ?? '',
        active: data.active ?? true,
        createdAt: normalizeDate(data.createdAt),
      } satisfies Announcement;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
}

export async function toggleAnnouncement(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'announcements', id), { active });
}
