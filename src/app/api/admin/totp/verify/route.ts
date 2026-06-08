import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdmin, issueMfaToken, MFA_COOKIE, MFA_TTL_SECONDS } from '@/lib/admin-mfa';
import { verifyTOTP } from '@/lib/totp';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Verifies a 6-digit TOTP code. On success, marks enrollment complete (first
 * time) and issues a short-lived MFA session cookie that sensitive admin routes
 * require. Brute-force protected (rate limit) and replay protected (a code's
 * time-step can't be reused).
 */
export async function POST(request: NextRequest) {
  const uid = await verifyAdmin(request);
  if (!uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Throttle so a stolen ID token can't brute-force the 6-digit second factor:
  // 5 tries / 5 min per admin, 20 / 5 min per source IP.
  const fwd = request.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || 'unknown';
  const [byUid, byIp] = await Promise.all([
    rateLimit(`totp:${uid}`, { maxHits: 5, windowMs: 5 * 60 * 1000, failClosed: true }),
    rateLimit(`totp-ip:${ip}`, { maxHits: 20, windowMs: 5 * 60 * 1000, failClosed: true }),
  ]);
  if (!byUid.ok || !byIp.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(byUid.retryAfter ?? byIp.retryAfter ?? 60) } }
    );
  }

  const { code } = (await request.json()) as { code?: string };
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const db = getFirestore();
  const ref = db.doc(`adminMfa/${uid}`);
  const snap = await ref.get();
  const secret = snap.exists ? (snap.data()?.secret as string | undefined) : undefined;
  if (!secret) {
    return NextResponse.json({ error: '2FA is not set up. Start setup first.' }, { status: 400 });
  }

  const step = verifyTOTP(secret, code);
  if (step === null) {
    return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 400 });
  }
  // Replay guard: each time-step may be consumed at most once.
  const lastStep = Number(snap.data()?.lastStep ?? 0);
  if (step <= lastStep) {
    return NextResponse.json({ error: 'This code was already used. Wait for the next one.' }, { status: 400 });
  }

  await ref.set(
    snap.data()?.enrolled
      ? { lastStep: step }
      : { enrolled: true, enrolledAt: new Date(), lastStep: step },
    { merge: true }
  );

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
