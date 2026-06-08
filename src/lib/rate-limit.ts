import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from './firebase-admin';

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number; // seconds until the next attempt is allowed
}

/**
 * Firestore-backed sliding-window rate limiter. Works across serverless
 * instances (unlike an in-memory Map) because the state lives in Firestore.
 *
 * @param key        Unique bucket key, e.g. `verify:<uid>`.
 * @param maxHits    Max attempts allowed within the window.
 * @param windowMs   Window length in milliseconds.
 * @param minGapMs   Minimum spacing between two consecutive attempts.
 * @param failClosed When the limiter's own backend (Firestore) errors:
 *                   - false (default): fail OPEN — allow the request. Use for
 *                     non-security abuse limits (donation/day, notifications) so
 *                     a transient outage never blocks legitimate traffic.
 *                   - true: fail CLOSED — deny the request. Use for
 *                     security-sensitive endpoints (TOTP, email verification) so
 *                     a forced backend outage can't be used to bypass
 *                     brute-force / abuse throttles.
 */
export async function rateLimit(
  key: string,
  { maxHits, windowMs, minGapMs = 0, failClosed = false }:
    { maxHits: number; windowMs: number; minGapMs?: number; failClosed?: boolean }
): Promise<RateLimitResult> {
  adminAuth(); // ensures the admin app is initialised
  const ref = getFirestore().doc(`rateLimits/${key.replace(/\//g, '_')}`);
  const now = Date.now();

  try {
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = (snap.exists ? (snap.data()?.hits as number[]) : []) ?? [];
      const recent = raw.filter((t) => now - t < windowMs);

      if (minGapMs > 0 && recent.length > 0) {
        const since = now - recent[recent.length - 1];
        if (since < minGapMs) {
          return { ok: false, retryAfter: Math.ceil((minGapMs - since) / 1000) };
        }
      }

      if (recent.length >= maxHits) {
        const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
        return { ok: false, retryAfter };
      }

      recent.push(now);
      tx.set(ref, { hits: recent, updatedAt: new Date() });
      return { ok: true };
    });
  } catch {
    // Backend (Firestore) error. Security-sensitive callers fail CLOSED so an
    // induced outage can't bypass the throttle; others fail OPEN for availability.
    return failClosed ? { ok: false, retryAfter: 30 } : { ok: true };
  }
}
