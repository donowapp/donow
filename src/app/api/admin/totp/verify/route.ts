import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdmin, issueMfaToken, MFA_COOKIE, MFA_TTL_SECONDS } from '@/lib/admin-mfa';
import { verifyTOTP } from '@/lib/totp';

/**
 * Verifies a 6-digit TOTP code. On success, marks enrollment complete (first
 * time) and issues a short-lived MFA session cookie that sensitive admin routes
 * require.
 */
export async function POST(request: NextRequest) {
  const uid = await verifyAdmin(request);
  if (!uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { code } = (await request.json()) as { code?: string };
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const db = getFirestore();
  const ref = db.doc(`adminMfa/${uid}`);
  const snap = await ref.get();
  const secret = snap.exists ? (snap.data()?.secret as string | undefined) : undefined;
  if (!secret) {
    return NextResponse.json({ error: '2FA is not set up. Start setup first.' }, { status: 400 });
  }

  if (!verifyTOTP(secret, code)) {
    return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 400 });
  }

  if (!snap.data()?.enrolled) {
    await ref.set({ enrolled: true, enrolledAt: new Date() }, { merge: true });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: MFA_COOKIE,
    value: issueMfaToken(uid),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MFA_TTL_SECONDS,
  });
  return res;
}
