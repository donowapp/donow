import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdmin, passesMfaGate } from '@/lib/admin-mfa';

const STR_FIELDS = [
  'platformName', 'tagline', 'supportEmail', 'heroImageUrl', 'maintenanceMessage',
  'logoUrl', 'ogImageUrl', 'androidApkUrl', 'iosAppUrl', 'contactPhone',
  'instagramUrl', 'twitterUrl', 'whatsappNumber', 'facebookUrl', 'youtubeUrl',
  'linkedinUrl', 'telegramUrl', 'pinterestUrl', 'threadsUrl',
] as const;
const BOOL_FIELDS = [
  'messagingEnabled', 'requireVerificationForPosting', 'ratingsEnabled',
  'savedDonationsEnabled', 'maintenanceMode',
] as const;
// Analytics IDs are interpolated into inline <script> on every page, so they are
// strictly format-validated here (and again client-side) to prevent stored XSS.
const ANALYTICS: Record<string, RegExp> = {
  googleAnalyticsId: /^(G|UA|AW|GT)-[A-Z0-9-]{1,20}$/i,
  googleTagManagerId: /^GTM-[A-Z0-9]{1,12}$/i,
  metaPixelId: /^[0-9]{6,20}$/,
};
const s = (v: unknown, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Allow-lists settings to known keys with type/length/format checks. Unknown
 * keys are dropped, so a compromised admin can't smuggle arbitrary or malicious
 * fields (e.g. script-bearing analytics IDs) into the public settings doc.
 */
function sanitizeSettings(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of STR_FIELDS) if (k in input) out[k] = s(input[k]);
  for (const k of BOOL_FIELDS) if (k in input) out[k] = Boolean(input[k]);

  if ('maxDonationsPerDay' in input) {
    const n = Math.floor(Number(input.maxDonationsPerDay));
    out.maxDonationsPerDay = Number.isFinite(n) ? Math.min(Math.max(n, 1), 1000) : 5;
  }

  for (const [k, re] of Object.entries(ANALYTICS)) {
    if (k in input) {
      const v = s(input[k], 40).trim();
      out[k] = v === '' || re.test(v) ? v : ''; // invalid → cleared, never stored raw
    }
  }

  if (Array.isArray(input.trustBadges)) {
    out.trustBadges = input.trustBadges.slice(0, 20).map((b) => ({
      icon: s((b as Record<string, unknown>)?.icon, 8),
      label: s((b as Record<string, unknown>)?.label, 60),
      enabled: Boolean((b as Record<string, unknown>)?.enabled),
    }));
  }
  if (Array.isArray(input.heroStats)) {
    out.heroStats = input.heroStats.slice(0, 12).map((h) => ({
      icon: s((h as Record<string, unknown>)?.icon, 8),
      label: s((h as Record<string, unknown>)?.label, 60),
      val: s((h as Record<string, unknown>)?.val, 40),
      sub: s((h as Record<string, unknown>)?.sub, 60),
    }));
  }
  return out;
}

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

  const clean = sanitizeSettings(settings as Record<string, unknown>);

  try {
    // merge:true so a partial payload never clobbers unrelated fields.
    await getFirestore().doc('settings/platform').set(clean, { merge: true });
  } catch (err) {
    console.error('[admin/settings]', err);
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
