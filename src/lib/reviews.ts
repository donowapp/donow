import { db } from './firebase';
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { Review } from '@/types';

type FirestoreTimestamp = { toDate: () => Date };

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as FirestoreTimestamp).toDate();
  }
  return new Date();
}

function normalizeReview(id: string, data: Record<string, unknown>): Review {
  return {
    id,
    donationId: (data.donationId as string) ?? '',
    reviewerId: (data.reviewerId as string) ?? '',
    reviewerName: (data.reviewerName as string) ?? 'User',
    revieweeId: (data.revieweeId as string) ?? '',
    rating: (data.rating as number) ?? 5,
    comment: (data.comment as string) ?? '',
    createdAt: normalizeDate(data.createdAt),
  };
}

export async function addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'reviews'), {
    ...review,
    createdAt: new Date(),
  });
}

export async function getDonationReviews(donationId: string): Promise<Review[]> {
  const q = query(collection(db, 'reviews'), where('donationId', '==', donationId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => normalizeReview(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function hasUserReviewed(donationId: string, reviewerId: string): Promise<boolean> {
  const q = query(
    collection(db, 'reviews'),
    where('donationId', '==', donationId),
    where('reviewerId', '==', reviewerId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function getDonorAverageRating(
  revieweeId: string
): Promise<{ avg: number; count: number }> {
  const q = query(collection(db, 'reviews'), where('revieweeId', '==', revieweeId));
  const snap = await getDocs(q);
  if (snap.empty) return { avg: 0, count: 0 };
  const ratings = snap.docs.map((d) => (d.data().rating as number) ?? 0);
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return { avg: Math.round(avg * 10) / 10, count: ratings.length };
}
