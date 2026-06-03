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
 * @param key      Unique bucket key, e.g. `verify:<uid>`.
 * @param maxHits  Max attempts allowed within the window.
 * @param windowMs Window length in milliseconds.
 * @param minGapMs Minimum spacing between two consecutive attempts.
 */
export async function rateLimit(
  key: string,
  { maxHits, windowMs, minGapMs = 0 }: { maxHits: number; windowMs: number; minGapMs?: number }
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
    // Fail open: a rate-limiter outage must not block legitimate verification.
    return { ok: true };
  }
}
