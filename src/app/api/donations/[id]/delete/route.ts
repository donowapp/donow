import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { cleanupDonation } from '@/lib/delete-donation';

/**
 * Owner self-delete for a donation. Routed server-side (rather than a client
 * deleteDoc) so the full cascade runs — reviews, conversations and the private
 * address subdoc are removed too, leaving no orphans.
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
  if (!snap.exists) return NextResponse.json({ ok: true }); // already gone
  if (snap.data()?.userId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await cleanupDonation(id);
  } catch (err) {
    console.error('[donations/delete]', err);
    return NextResponse.json({ error: 'Could not delete donation' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
