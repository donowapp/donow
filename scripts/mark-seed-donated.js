// Mark every seeded donation as donated (status: 'completed').
// Mirrors lib/donations.markDonationCompleted exactly — only status + updatedAt
// change; images, titles and all other fields are left untouched.
// Run:  node scripts/mark-seed-donated.js

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

(function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  const re = /^([A-Za-z0-9_]+)\s*=\s*(?:"([\s\S]*?)"|'([\s\S]*?)'|([^\n]*))/gm;
  let m;
  while ((m = re.exec(txt))) {
    const k = m[1];
    const v = m[2] ?? m[3] ?? m[4] ?? '';
    if (!(k in process.env)) process.env[k] = v;
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

async function main() {
  const snap = await db.collection('donations').where('seed', '==', true).get();
  let n = 0;
  for (const doc of snap.docs) {
    await doc.ref.update({ status: 'completed', updatedAt: new Date() });
    n++;
  }
  console.log(`Marked ${n} seeded donations as donated (status: completed). Images/titles untouched.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
