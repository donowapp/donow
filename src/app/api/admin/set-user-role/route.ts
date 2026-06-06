import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';

type Role = 'user' | 'admin';
const VALID: Role[] = ['user', 'admin'];

function getSuperAdminUids(): Set<string> {
  const raw = process.env.SUPER_ADMIN_UIDS ?? '';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * Super-admin-only: promote or demote a user's role.
 * Regular admins are NOT allowed — only UIDs listed in SUPER_ADMIN_UIDS may call this.
 * Role writes go through Admin SDK (bypasses Firestore rules) to prevent privilege escalation.
 */
export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = adminAuth();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let callerUid: string;
  try {
    callerUid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!getSuperAdminUids().has(callerUid)) {
    return NextResponse.json({ error: 'Forbidden: super-admin required' }, { status: 403 });
  }

  const { uid, role } = (await request.json()) as { uid?: string; role?: Role };
  if (!uid || !role || !VALID.includes(role)) {
    return NextResponse.json({ error: 'uid and valid role required' }, { status: 400 });
  }
  if (uid === callerUid) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const dbAdmin = getFirestore();
  try {
    await dbAdmin.doc(`users/${uid}`).update({ role, updatedAt: new Date() });
  } catch (err) {
    console.error('[set-user-role]', err);
    return NextResponse.json({ error: 'Could not update role' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
