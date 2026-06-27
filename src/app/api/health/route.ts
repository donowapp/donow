import { NextResponse } from 'next/server';

/**
 * Lightweight liveness endpoint for external monitoring (UptimeRobot, etc.).
 * Deliberately does NO database work so it stays cheap and can't be turned into
 * a Firestore-cost amplifier under a flood — it confirms the app process is up
 * and serving, nothing more. For deeper checks, add a separate readiness probe.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
    time: new Date().toISOString(),
  });
}
