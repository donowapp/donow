import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';

const ALLOWED_TYPES = new Set(['message', 'interest', 'review']);

/**
 * Server-side notification creation. Clients can no longer write notifications
 * directly (firestore.rules denies it), so:
 *  - the sender (createdBy) is taken from the verified token, never spoofable
 *  - type is validated against an allow-list; title/body are length-capped
 *  - a per-sender rate limit blunts mass notification spam / phishing
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

  const body = (await request.json()) as {
    userId?: string; type?: string; title?: string; body?: string;
    donationId?: string; conversationId?: string;
  };
  if (!body.userId || !body.type || !ALLOWED_TYPES.has(body.type)) {
    return NextResponse.json({ error: 'userId and valid type required' }, { status: 400 });
  }

  // Per-sender throttle: at most 60 notifications/hour.
  const limit = await rateLimit(`notif:${uid}`, { maxHits: 60, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many notifications' }, { status: 429 });
  }

  try {
    await getFirestore().collection('notifications').add({
      userId: String(body.userId),
      type: body.type,
      title: String(body.title ?? '').slice(0, 120),
      body: String(body.body ?? '').slice(0, 500),
      isRead: false,
      createdBy: uid,
      ...(body.donationId ? { donationId: String(body.donationId) } : {}),
      ...(body.conversationId ? { conversationId: String(body.conversationId) } : {}),
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[notifications/create]', err);
    return NextResponse.json({ error: 'Could not create notification' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
