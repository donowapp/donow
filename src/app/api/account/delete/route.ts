import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Self-serve account deletion (DPDP "right to erasure").
 *
 * The caller is identified solely by their verified Firebase ID token, so a
 * user can only ever delete their own account. The cascade order matters:
 * Firestore data and Cloudinary assets are purged first, and the Firebase Auth
 * account is removed LAST — if anything earlier fails we return an error and
 * the account still exists, so the user can retry rather than being left in a
 * half-deleted, un-authable state.
 *
 * What happens to each kind of data:
 *  - users/{uid}, publicProfiles/{uid}      → hard-deleted
 *  - donations (userId == uid)              → hard-deleted (+ Cloudinary images)
 *  - notifications (userId == uid)          → hard-deleted
 *  - conversations (uid is a participant)   → hard-deleted incl. messages
 *  - reviews written by the user            → anonymised (name → "Deleted user")
 *  - reviews about the user                 → hard-deleted (subject is gone)
 *  - Firebase Auth account                  → deleted, tokens revoked
 */

// Pull the Cloudinary public_id out of a secure_url so we can delete the asset.
// e.g. https://res.cloudinary.com/<cloud>/image/upload/v1700000000/donow/abc.jpg
//      → donow/abc
function publicIdFromUrl(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return m ? m[1] : null;
}

// Best-effort deletion of Cloudinary assets. Never throws — image cleanup must
// not block erasure of the far more sensitive identity data in Firestore/Auth.
async function destroyCloudinaryAssets(urls: string[]): Promise<void> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;

  const publicIds = urls
    .map(publicIdFromUrl)
    .filter((id): id is string => Boolean(id));

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
        console.error('[account/delete] Cloudinary destroy failed for', publicId, err);
      }
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getFirestore();
    const imageUrls: string[] = [];

    // 1. Donations owned by the user — collect images, then delete.
    const donationsSnap = await db.collection('donations').where('userId', '==', uid).get();
    for (const d of donationsSnap.docs) {
      const imgs = (d.data().images as string[]) ?? [];
      imageUrls.push(...imgs);
    }

    // 2. Profile photo (private + public copy).
    const userSnap = await db.doc(`users/${uid}`).get();
    const profileImage = userSnap.exists ? (userSnap.data()?.profileImage as string | undefined) : undefined;
    if (profileImage) imageUrls.push(profileImage);

    // 3. Bulk-delete Firestore docs (chunked to stay under the 500-op batch cap).
    const refsToDelete = [
      ...donationsSnap.docs.map((d) => d.ref),
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

    // 4. Reviews WRITTEN by the user → anonymise rather than delete, so donor
    //    rating aggregates for OTHER users stay intact.
    const reviewsBySnap = await db.collection('reviews').where('reviewerId', '==', uid).get();
    for (let i = 0; i < reviewsBySnap.docs.length; i += 400) {
      const batch = db.batch();
      for (const r of reviewsBySnap.docs.slice(i, i + 400)) {
        batch.update(r.ref, { reviewerId: '', reviewerName: 'Deleted user' });
      }
      await batch.commit();
    }

    // 5. Conversations the user is part of → recursive delete (incl. messages).
    const convSnap = await db
      .collection('conversations')
      .where('participantIds', 'array-contains', uid)
      .get();
    await Promise.all(convSnap.docs.map((c) => db.recursiveDelete(c.ref)));

    // 6. Cloudinary assets (best-effort).
    await destroyCloudinaryAssets(imageUrls);

    // 7. Finally, the Auth account itself (revokes tokens implicitly on delete).
    await auth.deleteUser(uid);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[account/delete]', err);
    return NextResponse.json({ error: 'Could not delete account. Please try again.' }, { status: 500 });
  }
}
