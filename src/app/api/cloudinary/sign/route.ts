import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';

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

  // Throttle signature minting so an authed account can't drive unlimited
  // Cloudinary uploads (storage/bandwidth cost abuse). 50/hr comfortably covers
  // legitimate multi-image donations (≤10 images) plus retries.
  const upLimit = await rateLimit(`upload:${uid}`, { maxHits: 50, windowMs: 60 * 60 * 1000 });
  if (!upLimit.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(upLimit.retryAfter ?? 60) } }
    );
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

  // Restrict accepted formats at Cloudinary itself: signing `allowed_formats`
  // means the upload is rejected unless it's one of these raster image types —
  // this blocks SVG (script-bearing), PDFs, videos and other non-image payloads.
  // The client MUST send the identical allowed_formats value or the signature
  // fails. (Per-file size cap + "deliver SVG as attachment off" are set in the
  // Cloudinary console; client-side we also reject oversized files pre-upload.)
  const allowedFormats = 'jpg,jpeg,png,webp,heic';

  const timestamp = Math.round(Date.now() / 1000);
  // Params must be signed in alphabetical order.
  const paramsToSign = `allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return NextResponse.json({
    signature,
    timestamp,
    api_key: apiKey,
    cloud_name: cloudName,
    folder,
    allowed_formats: allowedFormats,
  });
}
