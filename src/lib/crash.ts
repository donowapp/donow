/**
 * Crash & error reporting (web) — vendor-agnostic abstraction.
 *
 * Call sites use `captureError()` so they never depend on a specific provider.
 * It always logs to the console, and (best-effort) persists a bounded record to
 * the Firestore `errors` collection so production issues are visible in the
 * Firebase console without a third-party service. Swapping in Sentry/GlitchTip
 * later is a one-function change here — nothing at the call sites changes.
 *
 * Safeguards: client-only, signed-in users only (rules require it), in-memory
 * throttle (so an error loop can't flood writes), and a doc shape that matches
 * the size-capped `errors` Firestore rule exactly.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const MAX_PER_SESSION = 20; // hard cap on error writes per page session
const MIN_GAP_MS = 3000; // minimum spacing between writes
let writeCount = 0;
let lastWrite = 0;

function sanitizeContext(ctx?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!ctx) return out;
  let n = 0;
  for (const [k, v] of Object.entries(ctx)) {
    if (n >= 19) break; // leave room for an auto-added "stack" key (rule caps at 20)
    out[String(k).slice(0, 40)] = String(v).slice(0, 500);
    n += 1;
  }
  return out;
}

async function persist(error: unknown, context?: Record<string, unknown>): Promise<void> {
  try {
    if (typeof window === 'undefined') return; // client-only; server uses console + Vercel logs
    const uid = auth.currentUser?.uid;
    if (!uid) return; // rules require an authed owner
    const now = Date.now();
    if (writeCount >= MAX_PER_SESSION || now - lastWrite < MIN_GAP_MS) return;
    writeCount += 1;
    lastWrite = now;

    const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
    const ctx = sanitizeContext(context);
    if (error instanceof Error && error.stack) ctx.stack = error.stack.slice(0, 500);

    await addDoc(collection(db, 'errors'), {
      uid,
      message,
      kind: typeof context?.kind === 'string' ? context.kind.slice(0, 40) : 'app',
      context: ctx,
      platform: 'web',
      createdAt: serverTimestamp(),
    });
  } catch {
    /* best-effort — reporting must never throw or block */
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    console.error('[captureError]', error, context ?? {});
    void persist(error, context);
  } catch {
    /* reporting must never throw */
  }
}

let installed = false;

/** Hooks global error + unhandled-rejection handlers. Idempotent. */
export function initObservability(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  window.addEventListener('error', (e) =>
    captureError(e.error ?? e.message, { kind: 'window.error' })
  );
  window.addEventListener('unhandledrejection', (e) =>
    captureError((e as PromiseRejectionEvent).reason, { kind: 'unhandledrejection' })
  );
}
