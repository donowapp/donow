import { Donation, User } from '@/types';
import { db } from './firebase';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

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
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Image upload is not configured. Please contact support.');
  }

  return Promise.all(
    images.map(async (image) => {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'donow');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData, signal: controller.signal }
        );
        clearTimeout(timer);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Image upload failed. Please try again.');
        return data.secure_url as string;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Image upload timed out. Check your connection and try again.');
        }
        throw err;
      }
    })
  );
}

export async function createDonation(data: CreateDonationData) {
  const imageUrls = await uploadDonationImages(data.images);
  const now = new Date();

  const donation = {
    userId: data.userId,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    condition: data.condition,
    images: imageUrls,
    location: {
      address: data.address.trim(),
      city: data.city.trim(),
    },
    status: 'active',
    viewCount: 0,
    interestedUsers: [],
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<Donation, 'id'>;

  const donationRef = await addDoc(collection(db, 'donations'), donation);
  return { id: donationRef.id, ...donation };
}

export async function getActiveDonations() {
  const donationsQuery = query(
    collection(db, 'donations'),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(donationsQuery);

  return snapshot.docs
    .map((donationDoc) =>
      normalizeDonation(donationDoc.id, donationDoc.data() as Partial<Donation>)
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(donationsQuery);
  return snapshot.docs
    .map((d) => normalizeDonation(d.id, d.data() as Partial<Donation>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
  await updateDoc(doc(db, 'donations', id), {
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    condition: data.condition,
    location: {
      address: data.address.trim(),
      city: data.city.trim(),
    },
    updatedAt: new Date(),
  });
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
  const q = query(collection(db, 'donations'), where('status', '==', 'active'));
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
  const userSnapshot = await getDoc(doc(db, 'users', userId));
  if (!userSnapshot.exists()) return null;
  const { uid, name, city, state, profileImage, donationCount, receivedCount, rating, isVerified } = userSnapshot.data() as User;
  return { uid, name, city, state, profileImage, donationCount, receivedCount, rating, isVerified };
}
