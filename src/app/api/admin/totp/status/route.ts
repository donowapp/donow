import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdmin, hasValidMfa } from '@/lib/admin-mfa';

/**
 * Reports whether the calling admin has enrolled in TOTP and whether they
 * currently hold a valid MFA session. Drives the admin-panel gate.
 */
export async function GET(request: NextRequest) {
  const uid = await verifyAdmin(request);
  if (!uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await getFirestore().doc(`adminMfa/${uid}`).get();
  const enrolled = snap.exists ? Boolean(snap.data()?.enrolled) : false;
  const verified = hasValidMfa(request, uid);

  return NextResponse.json({ enrolled, verified });
}
