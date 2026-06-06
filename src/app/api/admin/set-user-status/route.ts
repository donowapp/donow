import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { passesMfaGate } from '@/lib/admin-mfa';

type Status = 'active' | 'suspended' | 'banned';
const VALID: Status[] = ['active', 'suspended', 'banned'];

/**
 * Admin-only: change a user's status. Unlike a raw Firestore write, this also
 * disables/enables the Firebase Auth account so a banned user is actually
 * locked out (their existing ID token is revoked). The caller must present a
 * valid admin ID token in the Authorization header.
 */
export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = adminAuth();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // 1. Authenticate the caller from their ID token.
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let callerUid: string;
  try {
    callerUid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Authorize: the caller must be an admin.
  const dbAdmin = getFirestore();
  const callerSnap = await dbAdmin.doc(`users/${callerUid}`).get();
  if (callerSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2b. Require a valid two-factor session for this destructive action — but
  // only once the admin has enrolled, so a not-yet-enrolled admin isn't locked
  // out (the admin-panel gate pushes them to enroll on their next visit).
  if (!(await passesMfaGate(request, callerUid))) {
    return NextResponse.json({ error: 'Two-factor verification required' }, { status: 403 });
  }

  // 3. Validate input.
  const { uid, status } = (await request.json()) as { uid?: string; status?: Status };
  if (!uid || !status || !VALID.includes(status)) {
    return NextResponse.json({ error: 'uid and valid status required' }, { status: 400 });
  }
  if (uid === callerUid) {
    return NextResponse.json({ error: 'Admins cannot change their own status' }, { status: 400 });
  }

  // 4. Apply: Firestore status + Auth account disable + token revocation.
  const disabled = status !== 'active';
  try {
    await dbAdmin.doc(`users/${uid}`).update({ status, updatedAt: new Date() });
    await auth.updateUser(uid, { disabled });
    if (disabled) await auth.revokeRefreshTokens(uid);
  } catch (err) {
    console.error('[set-user-status]', err);
    return NextResponse.json({ error: 'Could not update user status' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
