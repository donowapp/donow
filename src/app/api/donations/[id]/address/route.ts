import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Owner-only: set/update a donation's PRIVATE exact address (PRIV-1). The public
 * donation doc holds only the city; the precise address lives in a gated subdoc
 * (donations/<id>/private/location) revealed to the owner and to anyone who has
 * opened a conversation about the donation. Client writes are denied by rules,
 * so this server route is the only write path.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
  const snap = await db.doc(`donations/${id}`).get();
  if (!snap.exists || snap.data()?.userId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { address } = (await request.json()) as { address?: string };
  const clean = (address ?? '').trim().slice(0, 300);
  try {
    await db.doc(`donations/${id}/private/location`).set({ address: clean, updatedAt: new Date() });
  } catch (err) {
    console.error('[donations/address]', err);
    return NextResponse.json({ error: 'Could not update address' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
