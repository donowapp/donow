import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { deleteUserData } from '@/lib/delete-user';

/**
 * Self-serve account deletion (DPDP "right to erasure"). The caller is
 * identified solely by their verified Firebase ID token, so a user can only
 * ever delete their own account. The cascade lives in lib/delete-user.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { uid } = await adminAuth().verifyIdToken(idToken);
    await deleteUserData(uid);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[account/delete]', err);
    return NextResponse.json({ error: 'Could not delete account. Please try again.' }, { status: 500 });
  }
}
