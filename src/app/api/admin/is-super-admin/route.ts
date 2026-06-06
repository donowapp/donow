import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

function getSuperAdminUids(): Set<string> {
  const raw = process.env.SUPER_ADMIN_UIDS ?? '';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ isSuperAdmin: false });

  try {
    const { uid } = await adminAuth().verifyIdToken(token);
    return NextResponse.json({ isSuperAdmin: getSuperAdminUids().has(uid) });
  } catch {
    return NextResponse.json({ isSuperAdmin: false });
  }
}
