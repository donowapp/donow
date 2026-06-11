// Remove everything created by scripts/seed-donations.js (anything tagged seed:true).
// Run:  node scripts/unseed-donations.js

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

(function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  const re = /^([A-Za-z0-9_]+)\s*=\s*(?:"([\s\S]*?)"|'([\s\S]*?)'|([^\n]*))/gm;
  let m;
  while ((m = re.exec(txt))) {
    const key = m[1];
    const v = m[2] ?? m[3] ?? m[4] ?? '';
    if (!(key in process.env)) process.env[key] = v;
  }
})();

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
const auth = getAuth();

async function main() {
  // delete seeded donations (+ their private subdocs)
  const donations = await db.collection('donations').where('seed', '==', true).get();
  let dCount = 0;
  for (const doc of donations.docs) {
    await db.recursiveDelete(doc.ref);
    dCount++;
  }

  // delete seeded users (Firestore doc + public profile + Auth account)
  const users = await db.collection('users').where('seed', '==', true).get();
  let uCount = 0;
  for (const doc of users.docs) {
    try { await auth.deleteUser(doc.id); } catch {}
    await db.doc(`publicProfiles/${doc.id}`).delete();
    await doc.ref.delete();
    uCount++;
  }
  // sweep any stray seed public profiles (in case the users doc was removed first)
  const profiles = await db.collection('publicProfiles').where('seed', '==', true).get();
  for (const doc of profiles.docs) await doc.ref.delete();
  console.log(`Removed ${dCount} seeded donations and ${uCount} seeded donors.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
