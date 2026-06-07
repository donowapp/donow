/**
 * Donow — Beta daily monitor (Phase 2 summary + Phase 4 reports check).
 *
 * Prints the daily beta summary from Firestore: the MOBILE funnel (the `events`
 * collection) and the unified `reports` queue. (WEB funnel events go to GA4 —
 * read those in GA4 Realtime/Reports; this script does not call the GA4 API.)
 *
 * Usage (needs an Admin SDK credential — same as the migration/seed scripts):
 *   # PowerShell:  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   node scripts/beta-daily.js
 *
 * Optional: pass a service-account path as the first arg instead of the env var:
 *   node scripts/beta-daily.js C:\path\to\serviceAccount.json
 */
const admin = require('firebase-admin');

const FUNNEL = [
  'sign_up', 'email_verified', 'donation_created', 'donation_viewed',
  'interest_expressed', 'chat_started', 'address_revealed',
  'donation_completed', 'review_submitted', 'report_submitted', 'upload_failed',
];

function initAdmin() {
  const saPath = process.argv[2];
  if (saPath) {
    admin.initializeApp({ credential: admin.credential.cert(require(require('path').resolve(saPath))) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    console.error('No credentials. Set GOOGLE_APPLICATION_CREDENTIALS or pass a service-account path.');
    process.exit(1);
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const since = startOfToday();
  const sinceTs = admin.firestore.Timestamp.fromDate(since);

  // --- Today's mobile events (single createdAt filter; grouped in memory) ---
  const evSnap = await db.collection('events').where('createdAt', '>=', sinceTs).get();
  const counts = Object.fromEntries(FUNNEL.map((e) => [e, 0]));
  const uids = new Set();
  evSnap.forEach((doc) => {
    const d = doc.data();
    if (counts[d.event] !== undefined) counts[d.event] += 1;
    if (d.uid) uids.add(d.uid);
  });

  // --- Reports (unified, web + mobile) ---
  const openSnap = await db.collection('reports').where('status', '==', 'open').get();
  let newReportsToday = 0;
  const reasonTally = {};
  const reporterByTarget = {};
  openSnap.forEach((doc) => {
    const r = doc.data();
    const created = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : null;
    if (created && created >= since) newReportsToday += 1;
    reasonTally[r.reason] = (reasonTally[r.reason] || 0) + 1;
    if (r.targetUserId) {
      reporterByTarget[r.targetUserId] = reporterByTarget[r.targetUserId] || new Set();
      reporterByTarget[r.targetUserId].add(r.reporterId);
    }
  });
  const repeatOffenders = Object.entries(reporterByTarget)
    .filter(([, reporters]) => reporters.size >= 2)
    .map(([uid, reporters]) => `${uid.slice(0, 6)}… (${reporters.size} reporters)`);
  const serious = Object.keys(reasonTally).filter((r) => r === 'scam' || r === 'harassment');

  const f = counts;
  const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

  console.log(`\nDONOW DAILY — ${new Date().toLocaleDateString('en-IN')}  (mobile events + reports)\n`);
  console.log(`Signups: ${f.sign_up}   Verified(web only): see GA4`);
  console.log(`New donations: ${f.donation_created}   DAU (distinct uids in events): ${uids.size}`);
  console.log(
    `Funnel: view ${f.donation_viewed} → interest ${f.interest_expressed} ` +
    `→ chat ${f.chat_started} → reveal ${f.address_revealed} → completed ${f.donation_completed}`
  );
  console.log(
    `Rates: view→interest ${pct(f.interest_expressed, f.donation_viewed)}, ` +
    `interest→chat ${pct(f.chat_started, f.interest_expressed)}, ` +
    `chat→complete ${pct(f.donation_completed, f.chat_started)}, ` +
    `complete→review ${pct(f.review_submitted, f.donation_completed)}`
  );
  console.log(`Reviews: ${f.review_submitted}   upload_failed: ${f.upload_failed}`);
  console.log(`\nReports — open total: ${openSnap.size} (new today: ${newReportsToday})  by reason: ${JSON.stringify(reasonTally)}`);
  if (serious.length) console.log(`🚩 SERIOUS reasons present: ${serious.join(', ')} — triage NOW`);
  if (repeatOffenders.length) console.log(`🚩 Repeat-reported users (≥2 reporters): ${repeatOffenders.join(', ')}`);
  if (!serious.length && !repeatOffenders.length && openSnap.size === 0) console.log('✓ reports queue clear');
  console.log('');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
