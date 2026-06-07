import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from './firebase-admin';

/**
 * Server-only: permanently delete a user and all their associated data.
 * Shared by self-serve deletion (/api/account/delete) and the admin route
 * (/api/admin/delete-user) so the cascade — and the "Auth account last" safety
 * ordering — stays in exactly one place.
 *
 *  - users/{uid}, publicProfiles/{uid}      → deleted
 *  - donations (userId == uid)              → deleted (+ Cloudinary images)
 *  - notifications (userId == uid)          → deleted
 *  - conversations (uid is a participant)   → deleted incl. messages
 *  - reviews written by the user            → anonymised ("Deleted user")
 *  - reviews about the user                 → deleted
 *  - Firebase Auth account                  → deleted LAST (revokes tokens)
 */

function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return m ? m[1] : null;
}

async function destroyCloudinaryAssets(urls: string[], uid: string): Promise<void> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;

  // CRITICAL: only ever destroy assets that live in THIS user's own folder.
  // Donation/profile image URLs are attacker-controllable (a user can store a
  // URL pointing at someone else's image), so without this prefix check a user
  // could delete other users' Cloudinary assets via the deletion cascade.
  const ownPrefix = `donow/u/${uid}/`;
  const publicIds = urls
    .map(publicIdFromUrl)
    .filter((id): id is string => Boolean(id) && (id as string).startsWith(ownPrefix));

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        const timestamp = Math.round(Date.now() / 1000);
        const signature = crypto
          .createHash('sha256')
          .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
          .digest('hex');
        const form = new FormData();
        form.append('public_id', publicId);
        form.append('timestamp', String(timestamp));
        form.append('api_key', apiKey);
        form.append('signature', signature);
        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
          method: 'POST',
          body: form,
        });
      } catch (err) {
        console.error('[delete-user] Cloudinary destroy failed for', publicId, err);
      }
    })
  );
}

export async function deleteUserData(uid: string): Promise<void> {
  const db = getFirestore();
  const imageUrls: string[] = [];

  // Donations owned by the user — collect images, then delete.
  const donationsSnap = await db.collection('donations').where('userId', '==', uid).get();
  for (const d of donationsSnap.docs) {
    imageUrls.push(...((d.data().images as string[]) ?? []));
  }

  // Profile photo.
  const userSnap = await db.doc(`users/${uid}`).get();
  const profileImage = userSnap.exists ? (userSnap.data()?.profileImage as string | undefined) : undefined;
  if (profileImage) imageUrls.push(profileImage);

  const refsToDelete = [
    db.doc(`users/${uid}`),
    db.doc(`publicProfiles/${uid}`),
  ];

  const notifSnap = await db.collection('notifications').where('userId', '==', uid).get();
  refsToDelete.push(...notifSnap.docs.map((d) => d.ref));

  // Reviews ABOUT the user (their donor profile is gone) → delete.
  const reviewsAboutSnap = await db.collection('reviews').where('revieweeId', '==', uid).get();
  refsToDelete.push(...reviewsAboutSnap.docs.map((d) => d.ref));

  for (let i = 0; i < refsToDelete.length; i += 400) {
    const batch = db.batch();
    for (const ref of refsToDelete.slice(i, i + 400)) batch.delete(ref);
    await batch.commit();
  }

  // Donations: recursiveDelete so each donation's subcollections go too — most
  // importantly donations/{id}/private/location, which holds the donor's EXACT
  // street address. A plain doc delete would orphan that PII. (cleanupDonation
  // already uses recursiveDelete for the self-delete path; this matches it.)
  await Promise.all(donationsSnap.docs.map((d) => db.recursiveDelete(d.ref)));

  // Reviews WRITTEN by the user → anonymise so other donors' aggregates stand.
  const reviewsBySnap = await db.collection('reviews').where('reviewerId', '==', uid).get();
  for (let i = 0; i < reviewsBySnap.docs.length; i += 400) {
    const batch = db.batch();
    for (const r of reviewsBySnap.docs.slice(i, i + 400)) {
      batch.update(r.ref, { reviewerId: '', reviewerName: 'Deleted user' });
    }
    await batch.commit();
  }

  // Conversations the user is part of → recursive delete (incl. messages).
  const convSnap = await db
    .collection('conversations')
    .where('participantIds', 'array-contains', uid)
    .get();
  await Promise.all(convSnap.docs.map((c) => db.recursiveDelete(c.ref)));

  // Cloudinary assets (best-effort) — only this user's own folder.
  await destroyCloudinaryAssets(imageUrls, uid);

  // Auth account LAST — if anything above threw, the account still exists to retry.
  await adminAuth().deleteUser(uid);
}
