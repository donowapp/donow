import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdmin, passesMfaGate } from '@/lib/admin-mfa';

/**
 * Platform settings write — MFA-gated. Settings drive the whole site (support
 * email, feature flags, analytics IDs, social links), so a stolen admin token
 * must not be able to rewrite them without a valid TOTP session. Client writes
 * to settings/* are denied in firestore.rules; this is the only write path.
 */
export async function POST(request: NextRequest) {
  const callerUid = await verifyAdmin(request);
  if (!callerUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await passesMfaGate(request, callerUid))) {
    return NextResponse.json({ error: 'Two-factor verification required' }, { status: 403 });
  }

  const { settings } = (await request.json()) as { settings?: Record<string, unknown> };
  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'settings object required' }, { status: 400 });
  }

  try {
    await getFirestore().doc('settings/platform').set(settings);
  } catch (err) {
    console.error('[admin/settings]', err);
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
