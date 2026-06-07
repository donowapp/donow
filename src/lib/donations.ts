import { Donation, User } from '@/types';
import { auth, db } from './firebase';
import { getPublicProfile } from './profiles';
import { signedUpload } from './cloudinary';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit as fbLimit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

// Read caps: bound each list query (newest-first) instead of scanning the whole
// collection. Client-side search/filter runs over this recent window — large-
// scale needs server-side search before these caps are lifted/paginated.
const ACTIVE_LIST_CAP = 300;
const MY_LIST_CAP = 100;
const FEATURED_SCAN_CAP = 60;

export interface CreateDonationData {
  userId: string;
  title: string;
  description: string;
  category: Donation['category'];
  condition: Donation['condition'];
  address: string;
  city: string;
  images: File[];
}

type FirestoreTimestamp = {
  toDate: () => Date;
};

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as FirestoreTimestamp).toDate === 'function'
  );
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) return value;
  if (isFirestoreTimestamp(value)) return value.toDate();
  return new Date();
}

function normalizeDonation(id: string, data: Partial<Donation>) {
  return {
    id,
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
    viewCount: data.viewCount ?? 0,
    interestedUsers: data.interestedUsers ?? [],
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  } satisfies Donation;
}

async function uploadDonationImages(images: File[]): Promise<string[]> {
  return Promise.all(images.map((image) => signedUpload(image, 'item')));
}

export async function createDonation(data: CreateDonationData) {
  // Images upload via the signed Cloudinary path; the donation doc itself is
  // written by the server route, which enforces the active-account check and
  // the configurable per-day creation limit.
  const imageUrls = await uploadDonationImages(data.images);

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to create a donation.');

  const res = await fetch('/api/donations/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      address: data.address,
      city: data.city,
      images: imageUrls,
    }),
  });
  const result = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !result.id) {
    throw new Error(result.error ?? 'Could not create donation.');
  }
  return { id: result.id };
}

export async function getActiveDonations() {
  const donationsQuery = query(
    collection(db, 'donations'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    fbLimit(ACTIVE_LIST_CAP)
  );
  const snapshot = await getDocs(donationsQuery);
  return snapshot.docs.map((d) =>
    normalizeDonation(d.id, d.data() as Partial<Donation>)
  );
}

export async function getDonationById(id: string) {
  const donationRef = doc(db, 'donations', id);
  const snapshot = await getDoc(donationRef);

  if (!snapshot.exists()) return null;

  updateDoc(donationRef, {
    viewCount: increment(1),
  }).catch((error) => {
    console.error('Failed to update donation view count:', error);
  });

  return normalizeDonation(snapshot.id, snapshot.data() as Partial<Donation>);
}

export async function getMyDonations(userId: string) {
  const donationsQuery = query(
    collection(db, 'donations'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    fbLimit(MY_LIST_CAP)
  );
  const snapshot = await getDocs(donationsQuery);
  return snapshot.docs.map((d) => normalizeDonation(d.id, d.data() as Partial<Donation>));
}

export interface UpdateDonationData {
  title: string;
  description: string;
  category: Donation['category'];
  condition: Donation['condition'];
  address: string;
  city: string;
}

export async function updateDonation(id: string, data: UpdateDonationData) {
  // Only the city is public; the exact address is written to the gated private
  // subdoc via the owner-only server route (never to the public doc).
  await updateDoc(doc(db, 'donations', id), {
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    condition: data.condition,
    location: { city: data.city.trim() },
    updatedAt: new Date(),
  });
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    await fetch(`/api/donations/${id}/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ address: data.address }),
    }).catch(() => {});
  }
}

/**
 * Reads a donation's private exact address. Returns null when the caller isn't
 * allowed to see it yet (no conversation) — Firestore rules enforce the gate.
 */
export async function getDonationAddress(id: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'donations', id, 'private', 'location'));
    return snap.exists() ? ((snap.data().address as string) ?? null) : null;
  } catch {
    return null;
  }
}

export async function markDonationCompleted(id: string) {
  await updateDoc(doc(db, 'donations', id), {
    status: 'completed',
    updatedAt: new Date(),
  });
}

export async function deleteDonation(id: string) {
  await deleteDoc(doc(db, 'donations', id));
}

export async function toggleInterest(donationId: string, userId: string, interested: boolean) {
  await updateDoc(doc(db, 'donations', donationId), {
    interestedUsers: interested ? arrayUnion(userId) : arrayRemove(userId),
    updatedAt: new Date(),
  });
}

export async function getFeaturedDonations(limit = 6): Promise<Donation[]> {
  const q = query(
    collection(db, 'donations'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    fbLimit(FEATURED_SCAN_CAP)
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => normalizeDonation(d.id, d.data() as Partial<Donation>));
  const pinned = all.filter((d) => d.featured);
  const rest = all.filter((d) => !d.featured).sort(
    (a, b) => b.viewCount - a.viewCount || b.createdAt.getTime() - a.createdAt.getTime()
  );
  return [...pinned, ...rest].slice(0, limit);
}

export async function toggleSavedDonation(
  userId: string,
  donationId: string,
  save: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    savedDonations: save ? arrayUnion(donationId) : arrayRemove(donationId),
  });
}

export async function getSavedDonationsByIds(ids: string[]): Promise<Donation[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'donations'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      return snap.docs.map((d) => normalizeDonation(d.id, d.data() as Partial<Donation>));
    })
  );
  return results.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getDonorById(userId: string): Promise<Pick<User, 'uid' | 'name' | 'city' | 'state' | 'profileImage' | 'donationCount' | 'receivedCount' | 'rating' | 'isVerified'> | null> {
  // Reads the world-readable public profile, NOT the private /users doc
  // (which holds email/phone/address and is owner/admin-only).
  return getPublicProfile(userId);
}
