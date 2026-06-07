import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, passesMfaGate } from '@/lib/admin-mfa';
import { cleanupDonation } from '@/lib/delete-donation';

/**
 * Admin donation deletion — MFA-gated. Destructive and irreversible, so it
 * requires a valid TOTP session once the admin is enrolled. Recursively removes
 * the donation plus its reviews, conversations and private address subdoc.
 */
export async function POST(request: NextRequest) {
  const callerUid = await verifyAdmin(request);
  if (!callerUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!(await passesMfaGate(request, callerUid))) {
    return NextResponse.json({ error: 'Two-factor verification required' }, { status: 403 });
  }

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await cleanupDonation(id);
  } catch (err) {
    console.error('[admin/delete-donation]', err);
    return NextResponse.json({ error: 'Could not delete donation' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
