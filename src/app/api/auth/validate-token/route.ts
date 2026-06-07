import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';

const JWT_SECRET = process.env.EMAIL_JWT_SECRET;

export async function POST(request: NextRequest) {
  if (!JWT_SECRET) {
    console.error('[validate-token] EMAIL_JWT_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // 1) Validate the token. A failure here means the link is bad/expired (400).
  let payload: { uid: string; email: string; purpose?: string };
  try {
    const { token } = await request.json();
    payload = verify(token, JWT_SECRET) as { uid: string; email: string; purpose?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
  }
  // Only accept tokens minted for email verification — not, say, an MFA-session
  // token that happens to be signed with the same secret.
  if (payload.purpose !== 'email_verify') {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
  }

  // 2) Mark the account verified server-side (bypasses client-write rules).
  //    Possession of a valid token = proof the user controls this inbox.
  //    A failure here is a server/config problem (500), not a bad link.
  try {
    adminAuth(); // ensure the admin app is initialized
    await getFirestore()
      .doc(`users/${payload.uid}`)
      .update({ emailConfirmed: true, updatedAt: new Date() });
  } catch (err) {
    console.error('[validate-token] failed to set emailConfirmed', err);
    return NextResponse.json({ error: 'Could not complete verification' }, { status: 500 });
  }

  return NextResponse.json({ uid: payload.uid, email: payload.email });
}
