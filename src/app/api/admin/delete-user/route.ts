import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, passesMfaGate } from '@/lib/admin-mfa';
import { deleteUserData } from '@/lib/delete-user';

/**
 * Admin user deletion — MFA-gated. Runs the full cascade (not just the /users
 * doc, so no orphaned donations/profile/conversations are left behind). A
 * stolen admin ID token alone cannot delete users without a valid TOTP session.
 */
export async function POST(request: NextRequest) {
  const callerUid = await verifyAdmin(request);
  if (!callerUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await passesMfaGate(request, callerUid))) {
    return NextResponse.json({ error: 'Two-factor verification required' }, { status: 403 });
  }

  const { uid } = (await request.json()) as { uid?: string };
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });
  if (uid === callerUid) {
    return NextResponse.json({ error: 'Use account settings to delete your own account' }, { status: 400 });
  }

  try {
    await deleteUserData(uid);
  } catch (err) {
    console.error('[admin/delete-user]', err);
    return NextResponse.json({ error: 'Could not delete user' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
