import { db } from './firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { Donation, User } from '@/types';

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
  await updateDoc(doc(db, 'users', uid), { status, updatedAt: new Date() });
}

export async function setUserRole(
  uid: string,
  role: User['role']
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role, updatedAt: new Date() });
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

export async function adminDeleteDonation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'donations', id));
}

export async function setDonationFeatured(id: string, featured: boolean): Promise<void> {
  await updateDoc(doc(db, 'donations', id), { featured, updatedAt: new Date() });
}
