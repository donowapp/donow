// Seed the marketplace with realistic demo donations (4 per category = 40).
//
// Every created doc/user is tagged `seed: true` so it can be removed in one
// command later:  node scripts/unseed-donations.js
//
// Reads Admin SDK creds from .env.local (so no secrets touch the shell).
// Run:  node scripts/seed-donations.js

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// --- load .env.local without printing anything ---
(function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  // Whole-file, dotall regex so quoted values (e.g. the multi-line private key
  // with literal \n escapes) are captured intact.
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

const IMG = {
  medical:    'https://images.unsplash.com/photo-1646082275130-347d10885c5f?w=400&q=80&fit=crop',
  medicines:  'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&q=80&fit=crop',
  clothes:    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80&fit=crop',
  books:      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80&fit=crop',
  furniture:  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&fit=crop',
  electronics:'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80&fit=crop',
  toys:       'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80&fit=crop',
  food:       'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80&fit=crop',
  emergency:  'https://images.unsplash.com/photo-1599045118108-bf9954418b76?w=400&q=80&fit=crop',
  other:      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&q=80&fit=crop',
};

const CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Lucknow', 'Ahmedabad'];

// 4 useful items per category: [title, description, condition]
const CATALOG = {
  medical: [
    ['Foldable Wheelchair', 'Lightweight foldable wheelchair, fully functional. Helped my father recover; passing it on to someone in need.', 'good'],
    ['Pair of Walking Crutches', 'Adjustable aluminium crutches, barely used after a leg fracture healed.', 'good'],
    ['Manual Hospital Bed', 'Adjustable manual hospital bed with side rails. Ideal for home care of bedridden patients.', 'fair'],
    ['Oxygen Concentrator (5L)', 'Working 5L oxygen concentrator, serviced recently. For anyone who needs respiratory support at home.', 'good'],
  ],
  medicines: [
    ['Sealed Diabetes Test Strips', 'Unopened box of glucometer test strips, well within expiry. For diabetic patients who need them.', 'new'],
    ['Digital BP Monitor', 'Automatic upper-arm blood pressure monitor, accurate and clean. Comes with the cuff.', 'good'],
    ['Sealed Multivitamin Bottles', 'Two sealed bottles of general multivitamins, long expiry. Bought extra and never opened.', 'new'],
    ['Home First-Aid Kit', 'Complete first-aid kit — bandages, antiseptic, gauze, tape. Restocked and ready.', 'good'],
  ],
  clothes: [
    ["Kids' Winter Jackets (Bundle)", 'Bundle of 5 warm jackets for children aged 4–8. Washed and in great shape for the coming winter.', 'good'],
    ["Men's Formal Shirts (Set of 6)", 'Six formal shirts, sizes M–L. Clean and ironed, perfect for job interviews.', 'good'],
    ["Women's Sarees (Set of 4)", 'Four cotton and silk-blend sarees, gently used and freshly laundered.', 'good'],
    ['Woolen Blankets (Pair)', 'Two thick woolen blankets, washed and warm. Ideal for the winter months.', 'fair'],
  ],
  books: [
    ['NCERT Class 10 Full Set', 'Complete set of NCERT textbooks for Class 10 — all subjects, minimal markings.', 'good'],
    ['UPSC Prelims Guide Books', 'Set of competitive-exam preparation guides for UPSC aspirants. Latest editions.', 'good'],
    ["Children's Story Books (15)", 'Colourful illustrated story books for young readers, ages 5–10. Sturdy and clean.', 'good'],
    ['Engineering Textbooks (Mech)', 'Core mechanical engineering textbooks for 1st–2nd year students. Lightly used.', 'fair'],
  ],
  furniture: [
    ['Study Table with Chair', 'Wooden study table with a matching chair. Sturdy, ideal for a student.', 'good'],
    ['3-Seater Fabric Sofa', 'Comfortable 3-seater sofa, clean upholstery. Moving out, so giving it away.', 'fair'],
    ['Steel Almirah (2-Door)', 'Two-door steel wardrobe with a locker and shelves. Some scratches but very sturdy.', 'fair'],
    ['Single Bed Mattress', 'Clean single-bed foam mattress, no sagging. Sun-dried and ready to use.', 'good'],
  ],
  electronics: [
    ['Working Laptop (Core i5)', 'Core i5 laptop, 8GB RAM, runs smoothly for studies and online classes. Charger included.', 'good'],
    ['Android Smartphone', 'Functional Android phone, good battery. Wiped clean and reset for the next owner.', 'good'],
    ['Ceiling Fan', 'Working ceiling fan, quiet and efficient. Removed during a renovation.', 'fair'],
    ['LED Study Lamp', 'Rechargeable LED desk lamp with adjustable brightness. Great for kids studying at night.', 'good'],
  ],
  toys: [
    ['Building Blocks Set', 'Large box of building blocks, all pieces present. Cleaned and sanitised.', 'good'],
    ['Soft Teddy Bears (3)', 'Three soft, washable teddy bears. Loved but gently used.', 'good'],
    ['Board Games Bundle', 'Bundle of family board games — Ludo, Snakes & Ladders, Chess. Complete sets.', 'good'],
    ['Toddler Tricycle', 'Sturdy tricycle for toddlers, with a safety handle. Tyres in good condition.', 'fair'],
  ],
  food: [
    ['Rice & Dal Ration Kit', 'Sealed 5kg rice and 2kg dal kit. For a family that needs a helping hand this month.', 'new'],
    ['Sealed Biscuit Cartons', 'Two unopened cartons of biscuits, long shelf life. Surplus from a function.', 'new'],
    ['Cooking Oil Tins (2)', 'Two sealed 1L cooking oil pouches, unopened and within date.', 'new'],
    ['Sealed Baby Formula', 'Unopened tin of infant formula, long expiry. For families with infants.', 'new'],
  ],
  emergency: [
    ['Emergency Torch + Batteries', 'Bright rechargeable emergency torch with spare batteries. Useful during power cuts.', 'good'],
    ['Tarpaulin Sheets (Pair)', 'Two waterproof tarpaulin sheets, great for temporary shelter during the rains.', 'good'],
    ['Drinking Water Cans (20L x2)', 'Two clean 20L water cans, sealed. For relief during shortages.', 'good'],
    ['Relief Blankets (Bundle)', 'Bundle of warm blankets for shelters and night-relief drives.', 'fair'],
  ],
  other: [
    ['Steel Utensils Set', 'Complete steel kitchen utensils set — plates, bowls, glasses, serving spoons.', 'good'],
    ['School Bags (3)', 'Three sturdy school backpacks with working zips. Cleaned and ready for students.', 'good'],
    ['Manual Sewing Machine', 'Working manual sewing machine, recently oiled. Can help someone start tailoring work.', 'fair'],
    ['Adult Bicycle', 'Single-speed adult bicycle, good tyres and brakes. Reliable for daily commute.', 'fair'],
  ],
};

const DONORS = [
  { email: 'seed.donor1@donow.co.in', name: 'Community Helpers' },
  { email: 'seed.donor2@donow.co.in', name: 'Aarav Mehta' },
  { email: 'seed.donor3@donow.co.in', name: 'Sunita Reddy' },
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function ensureDonor(d) {
  let user;
  try {
    user = await auth.getUserByEmail(d.email);
  } catch {
    user = await auth.createUser({
      email: d.email,
      emailVerified: true,
      displayName: d.name,
      password: 'Seed!' + Math.random().toString(36).slice(2) + 'A9',
    });
  }
  const now = new Date();
  const userRef = db.doc(`users/${user.uid}`);
  const existing = await userRef.get();
  // Re-runs must not clobber city or reset counters — only create defaults once.
  const city = existing.exists ? existing.data().city : rand(CITIES);
  if (!existing.exists) {
    await userRef.set({
      uid: user.uid, email: d.email, phone: '', name: d.name,
      address: '', city, state: '', pincode: '',
      isVerified: true, emailConfirmed: true,
      donationCount: 0, receivedCount: 0, rating: 0,
      role: 'user', status: 'active', seed: true,
      createdAt: now, updatedAt: now,
    });
  }
  // The donor shown on donation pages comes from the world-readable
  // publicProfiles doc (users/ is owner/admin-only) — without this, the donor
  // card is blank and "Message Donor" silently no-ops.
  await db.doc(`publicProfiles/${user.uid}`).set({
    name: d.name, city, state: '',
    isVerified: true, rating: 0, receivedCount: 0, seed: true,
    updatedAt: now,
  }, { merge: true });
  return user.uid;
}

async function main() {
  console.log('Creating seed donors...');
  const uids = [];
  for (const d of DONORS) uids.push(await ensureDonor(d));

  let n = 0;
  const counts = {};
  for (const [category, items] of Object.entries(CATALOG)) {
    for (const [title, description, condition] of items) {
      const uid = uids[n % uids.length];
      // stagger createdAt over the last ~20 days so the feed looks organic
      const created = new Date(Date.now() - Math.floor(Math.random() * 20 * 864e5));
      await db.collection('donations').add({
        userId: uid,
        title, description, category, condition,
        images: [IMG[category]],
        location: { city: rand(CITIES) },
        status: 'active',
        viewCount: Math.floor(Math.random() * 40),
        interestedUsers: [],
        seed: true,
        createdAt: created,
        updatedAt: created,
      });
      counts[uid] = (counts[uid] || 0) + 1;
      n++;
    }
  }
  // reflect donationCount on each donor for realism (recomputed from actual
  // docs so re-runs accumulate instead of overwriting)
  for (const uid of uids) {
    const owned = await db.collection('donations')
      .where('seed', '==', true).where('userId', '==', uid).get();
    await db.doc(`users/${uid}`).update({ donationCount: owned.size });
    await db.doc(`publicProfiles/${uid}`).set({ donationCount: owned.size }, { merge: true });
  }
  console.log(`Done. Seeded ${n} donations across ${uids.length} donors and ${Object.keys(CATALOG).length} categories.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
