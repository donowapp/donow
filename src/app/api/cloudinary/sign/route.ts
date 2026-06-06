import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminAuth } from '@/lib/firebase-admin';

const ALLOWED_FOLDERS = new Set(['donow', 'donow/avatars']);

/**
 * Generates a short-lived Cloudinary signed-upload signature.
 * Requires a valid Firebase ID token — only authenticated users may upload.
 * The unsigned upload preset is no longer used; this is the sole upload path.
 */
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await adminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { folder: requestedFolder = 'donow' } = (await request.json()) as { folder?: string };
  const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : 'donow';

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return NextResponse.json({ signature, timestamp, api_key: apiKey, cloud_name: cloudName, folder });
}
