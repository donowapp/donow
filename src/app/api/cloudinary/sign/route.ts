import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Generates a short-lived Cloudinary signed-upload signature.
 * Requires a valid Firebase ID token — only authenticated users may upload.
 * The unsigned upload preset is no longer used; this is the sole upload path.
 *
 * User content (avatars, donation images) is pinned to the caller's own folder
 * `donow/u/<uid>` so that account deletion only ever destroys that user's own
 * assets. Platform assets (`donow/platform`) are admin-only.
 */
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { kind = 'item' } = (await request.json()) as { kind?: string };
  let folder = `donow/u/${uid}`;
  if (kind === 'platform') {
    // Hero/logo/OG images are site-wide — only admins may write them.
    const snap = await getFirestore().doc(`users/${uid}`).get();
    if (snap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    folder = 'donow/platform';
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return NextResponse.json({ signature, timestamp, api_key: apiKey, cloud_name: cloudName, folder });
}
