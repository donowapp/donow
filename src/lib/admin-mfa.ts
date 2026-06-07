import { NextRequest } from 'next/server';
import { sign, verify } from 'jsonwebtoken';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from './firebase-admin';

/**
 * Server-only helpers for the admin app-level TOTP second factor.
 *
 * The "MFA session" is a short-lived signed cookie issued after a valid TOTP
 * code. Sensitive admin routes require both a valid Firebase ID token AND this
 * cookie, so a stolen ID token alone can't perform privileged admin actions.
 */

export const MFA_COOKIE = 'admin_mfa';
export const MFA_TTL_SECONDS = 8 * 60 * 60; // 8 hours

function mfaSecret(): string {
  // Dedicated secret if provided, else reuse the email JWT secret so the
  // feature works without additional configuration.
  return process.env.ADMIN_MFA_SECRET || process.env.EMAIL_JWT_SECRET || '';
}

/**
 * Verifies the Firebase ID token from the Authorization header AND that the
 * caller's /users doc has role === 'admin'. Returns the uid, or null if either
 * check fails.
 */
export async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const uid = (await adminAuth().verifyIdToken(token)).uid;
    const snap = await getFirestore().doc(`users/${uid}`).get();
    if (!snap.exists || snap.data()?.role !== 'admin') return null;
    return uid;
  } catch {
    return null;
  }
}

export function issueMfaToken(uid: string): string {
  return sign({ uid, purpose: 'admin_mfa' }, mfaSecret(), { expiresIn: MFA_TTL_SECONDS });
}

/** Whether this admin has completed TOTP enrollment. */
export async function isMfaEnrolled(uid: string): Promise<boolean> {
  const snap = await getFirestore().doc(`adminMfa/${uid}`).get();
  return snap.exists ? Boolean(snap.data()?.enrolled) : false;
}

/**
 * Gate for sensitive admin routes. TOTP enrollment is MANDATORY: an admin who
 * has not enrolled is denied (so a stolen ID token of a never-enrolled admin
 * can't perform privileged actions). This does not lock anyone out — the
 * setup/verify routes are NOT gated by this function, so an admin can always
 * enroll, then act. Once enrolled, a valid MFA session cookie is required.
 *
 * Recovery: a super-admin clears the admin's `adminMfa/<uid>` doc (console or a
 * dedicated route) to let them re-enroll with a new authenticator.
 */
export async function passesMfaGate(request: NextRequest, uid: string): Promise<boolean> {
  if (!(await isMfaEnrolled(uid))) return false;
  return hasValidMfa(request, uid);
}

/** True if the request carries a valid, unexpired MFA cookie for this uid. */
export function hasValidMfa(request: NextRequest, uid: string): boolean {
  const secret = mfaSecret();
  if (!secret) return false;
  const cookie = request.cookies.get(MFA_COOKIE)?.value;
  if (!cookie) return false;
  try {
    const payload = verify(cookie, secret) as { uid?: string; purpose?: string };
    return payload.purpose === 'admin_mfa' && payload.uid === uid;
  } catch {
    return false;
  }
}
