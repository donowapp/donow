import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '@/types';

/**
 * The world-readable subset of a user, stored in /publicProfiles/{uid}.
 * This is what other users see next to a donation — it deliberately excludes
 * email, phone, address and pincode (those stay private in /users).
 */
export type PublicProfile = Pick<
  User,
  'uid' | 'name' | 'city' | 'state' | 'profileImage' | 'donationCount' | 'receivedCount' | 'rating' | 'isVerified'
>;

// Fields the owner is allowed to write themselves (must match firestore.rules).
type OwnerEditable = { name: string; city: string; state: string; profileImage?: string };

/**
 * Create/refresh the current user's own public profile (display fields only).
 * Trust fields (isVerified/rating/counts) are written by admin/server paths.
 */
export async function syncOwnPublicProfile(uid: string, fields: OwnerEditable): Promise<void> {
  await setDoc(
    doc(db, 'publicProfiles', uid),
    {
      name: fields.name ?? '',
      city: fields.city ?? '',
      state: fields.state ?? '',
      ...(fields.profileImage ? { profileImage: fields.profileImage } : {}),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, 'publicProfiles', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    name: (d.name as string) ?? '',
    city: (d.city as string) ?? '',
    state: (d.state as string) ?? '',
    profileImage: d.profileImage as string | undefined,
    donationCount: (d.donationCount as number) ?? 0,
    receivedCount: (d.receivedCount as number) ?? 0,
    rating: (d.rating as number) ?? 0,
    isVerified: (d.isVerified as boolean) ?? false,
  };
}
