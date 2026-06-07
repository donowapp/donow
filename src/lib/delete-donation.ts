import { getFirestore } from 'firebase-admin/firestore';

/**
 * Server-only: fully remove a donation and everything that hangs off it, so a
 * delete never leaves orphans behind:
 *  - reviews about the donation        → deleted
 *  - conversations about the donation   → deleted incl. their messages subcoll.
 *  - donations/<id>/private/*           → deleted (Firestore doesn't cascade
 *                                          subcollections on a doc delete)
 *  - the donation document itself       → deleted
 *
 * Shared by the owner self-delete route and the MFA-gated admin route.
 */
export async function cleanupDonation(id: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`donations/${id}`);

  const [reviews, convs] = await Promise.all([
    db.collection('reviews').where('donationId', '==', id).get(),
    db.collection('conversations').where('donationId', '==', id).get(),
  ]);

  for (let i = 0; i < reviews.docs.length; i += 400) {
    const batch = db.batch();
    for (const d of reviews.docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }

  // Recursive delete handles each conversation's messages subcollection, and the
  // donation's private/ subcollection + the donation doc.
  await Promise.all(convs.docs.map((c) => db.recursiveDelete(c.ref)));
  await db.recursiveDelete(ref);
}
