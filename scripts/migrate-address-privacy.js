// One-time migration for PRIV-1 (address privacy).
//
// Moves each donation's exact `location.address` into the gated private subdoc
// donations/<id>/private/location, then strips `address` from the public doc
// (leaving only `location.city`). Idempotent: donations already migrated (no
// public address) are skipped, so it's safe to re-run.
//
// Run once, after deploying the new rules:
//   FIREBASE_ADMIN_PROJECT_ID=... FIREBASE_ADMIN_CLIENT_EMAIL=... \
//   FIREBASE_ADMIN_PRIVATE_KEY="..." node scripts/migrate-address-privacy.js

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function main() {
  const snap = await db.collection('donations').get();
  let moved = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const loc = doc.data().location || {};
    const address = String(loc.address || '').trim();
    if (!address) { skipped++; continue; }
    await doc.ref.collection('private').doc('location').set(
      { address, updatedAt: new Date() },
      { merge: true }
    );
    await doc.ref.update({ 'location.address': FieldValue.delete() });
    moved++;
  }
  console.log(`PRIV-1 migration complete: moved ${moved}, skipped ${skipped} (no public address).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
