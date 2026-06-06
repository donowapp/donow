import crypto from 'crypto';

/**
 * Minimal RFC 6238 TOTP implementation (SHA-1, 6 digits, 30s step) plus the
 * RFC 4648 base32 helpers authenticator apps expect. Server-only — never import
 * this into client code, as it deals with raw shared secrets.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = '';
  for (const byte of buf) bits += byte.toString(2).padStart(8, '0');
  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = '';
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit code against the secret, tolerating ±1 time step (±30s)
 * for clock drift. Uses constant-time comparison.
 */
export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const cleaned = (token ?? '').replace(/\D/g, '');
  if (cleaned.length !== 6) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = hotp(secret, counter + errorWindow);
    if (
      expected.length === cleaned.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))
    ) {
      return true;
    }
  }
  return false;
}

/** Builds the otpauth:// URI an authenticator app scans. */
export function buildOtpAuthUri(secret: string, account: string, issuer = 'Donow'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
