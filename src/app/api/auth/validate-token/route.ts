import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.EMAIL_JWT_SECRET ?? 'donow-verify-secret-change-in-prod';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const payload = verify(token, JWT_SECRET) as { uid: string; email: string };
    return NextResponse.json({ uid: payload.uid, email: payload.email });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
  }
}
