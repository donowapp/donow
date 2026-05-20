/**
 * Donation data access helpers
 * Handles Firestore donation records and Firebase Storage uploads.
 */

import { Donation, User } from '@/types';
import { db, storage } from './firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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
    viewCount: data.viewCount ?? 0,
    interestedUsers: data.interestedUsers ?? [],
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  } satisfies Donation;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string
) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(message));
      }, milliseconds);
    }),
  ]);
}

async function uploadDonationImages(userId: string, images: File[]) {
  return Promise.all(
    images.map(async (image, index) => {
      const filePath = `donations/${userId}/${Date.now()}-${index}-${sanitizeFileName(
        image.name
      )}`;
      const imageRef = ref(storage, filePath);
      await withTimeout(
        uploadBytes(imageRef, image),
        30000,
        'Image upload timed out. Check Firebase Storage rules and CORS settings.'
      );
      return withTimeout(
        getDownloadURL(imageRef),
        10000,
        'Could not read uploaded image URL.'
      );
    })
  );
}

export async function createDonation(data: CreateDonationData) {
  const imageUrls = await uploadDonationImages(data.userId, data.images);
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

export async function getDonorById(userId: string) {
  const userSnapshot = await getDoc(doc(db, 'users', userId));
  return userSnapshot.exists() ? (userSnapshot.data() as User) : null;
}
