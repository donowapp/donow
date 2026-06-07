/**
 * Crash & error reporting (web) — vendor-agnostic abstraction.
 *
 * Call sites use `captureError()` so they never depend on a specific provider.
 * Today it logs to the console and is a safe no-op otherwise. To enable Sentry:
 *   1. `npm i @sentry/nextjs` and run `npx @sentry/wizard@latest -i nextjs`
 *   2. set NEXT_PUBLIC_SENTRY_DSN
 *   3. uncomment the Sentry.captureException line below.
 * Nothing else in the codebase changes — every catch already routes here.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    console.error('[captureError]', error, context ?? {});
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.captureException(error, { extra: context });
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
