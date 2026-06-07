import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';

const CATEGORIES = new Set([
  'medical', 'medicines', 'clothes', 'books', 'furniture',
  'electronics', 'toys', 'food', 'emergency', 'other',
]);
const CONDITIONS = new Set(['new', 'good', 'fair', 'worn']);

/**
 * Server-side donation creation. Clients can no longer create donations
 * directly (firestore.rules denies it), which lets us:
 *  - confirm the author is active (not banned/suspended)
 *  - enforce the configurable maxDonationsPerDay limit (previously unenforced)
 *  - stamp userId from the verified token
 */
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getFirestore();

  // Author must be active (mirrors the isActive() gate the old create rule had).
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists || userSnap.data()?.status !== 'active') {
    return NextResponse.json({ error: 'Your account cannot post donations.' }, { status: 403 });
  }

  // Validate the body BEFORE consuming a daily slot, so a malformed request
  // never burns the user's own quota.
  const b = (await request.json()) as {
    title?: string; description?: string; category?: string; condition?: string;
    address?: string; city?: string; images?: string[];
  };
  if (!b.title?.trim() || !b.description?.trim() ||
      !b.category || !CATEGORIES.has(b.category) ||
      !b.condition || !CONDITIONS.has(b.condition)) {
    return NextResponse.json({ error: 'Missing or invalid donation fields' }, { status: 400 });
  }
  // Only accept Cloudinary URLs from our cloud that live in THIS user's own
  // upload folder. Stops a user from storing (and later weaponising) URLs that
  // point at other users' assets or arbitrary external hosts.
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
  const ownPrefix = `https://res.cloudinary.com/${cloud}/`;
  const images = Array.isArray(b.images)
    ? b.images
        .filter((u): u is string =>
          typeof u === 'string' && u.startsWith(ownPrefix) && u.includes(`/donow/u/${uid}/`))
        .slice(0, 10)
    : [];

  // Daily cap from platform settings (default 5).
  const settingsSnap = await db.doc('settings/platform').get();
  const rawMax = settingsSnap.exists ? Number(settingsSnap.data()?.maxDonationsPerDay) : 5;
  const maxPerDay = Number.isFinite(rawMax) && rawMax > 0 ? Math.floor(rawMax) : 5;
  const limit = await rateLimit(`donation:${uid}`, { maxHits: maxPerDay, windowMs: 24 * 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Daily limit reached (${maxPerDay} donations/day). Try again later.` },
      { status: 429 }
    );
  }

  const now = new Date();
  const address = (b.address ?? '').trim().slice(0, 300);
  const donation = {
    userId: uid,
    title: b.title.trim().slice(0, 200),
    description: b.description.trim().slice(0, 5000),
    category: b.category,
    condition: b.condition,
    images,
    // PRIV-1: only the city is public; the exact address goes to a gated
    // private subdoc revealed once a conversation is opened.
    location: { city: (b.city ?? '').trim().slice(0, 120) },
    status: 'active',
    viewCount: 0,
    interestedUsers: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = await db.collection('donations').add(donation);
    if (address) {
      await ref.collection('private').doc('location').set({ address, updatedAt: now });
    }
    return NextResponse.json({ id: ref.id });
  } catch (err) {
    console.error('[donations/create]', err);
    return NextResponse.json({ error: 'Could not create donation' }, { status: 500 });
  }
}
