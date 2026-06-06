import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/admin-mfa';
import { generateBase32Secret, buildOtpAuthUri } from '@/lib/totp';

/**
 * Begins TOTP enrollment for an admin. Generates (or reuses a pending) secret,
 * stores it with enrolled:false, and returns the QR + secret for the
 * authenticator app. The secret is only revealed while NOT yet enrolled — once
 * enrolled it is never returned again.
 */
export async function POST(request: NextRequest) {
  const uid = await verifyAdmin(request);
  if (!uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getFirestore();
  const ref = db.doc(`adminMfa/${uid}`);
  const snap = await ref.get();

  if (snap.exists && snap.data()?.enrolled) {
    return NextResponse.json({ alreadyEnrolled: true });
  }

  // Reuse a pending secret if setup was started but not completed; else create.
  let secret = snap.exists ? (snap.data()?.secret as string | undefined) : undefined;
  if (!secret) {
    secret = generateBase32Secret();
    await ref.set({ secret, enrolled: false, createdAt: new Date() }, { merge: true });
  }

  const account = (await adminAuth().getUser(uid)).email ?? uid;
  const uri = buildOtpAuthUri(secret, account);
  const qr = await QRCode.toDataURL(uri);

  return NextResponse.json({ qr, secret, uri });
}
