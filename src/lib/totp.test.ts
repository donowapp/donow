import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateBase32Secret, verifyTOTP, buildOtpAuthUri } from './totp';

// RFC 6238 reference seed "12345678901234567890" (ASCII) in base32, and its
// SHA-1 / 30s / 6-digit code at T=59s (time-step 1) = 287082.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

afterEach(() => {
  vi.useRealTimers();
});

describe('generateBase32Secret', () => {
  it('emits only RFC 4648 base32 characters', () => {
    const s = generateBase32Secret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
  });

  it('length follows the byte count (20 bytes → 32 chars, 10 → 16)', () => {
    expect(generateBase32Secret(20)).toHaveLength(32);
    expect(generateBase32Secret(10)).toHaveLength(16);
  });

  it('is random (two secrets differ)', () => {
    expect(generateBase32Secret()).not.toBe(generateBase32Secret());
  });
});

describe('verifyTOTP', () => {
  it('rejects malformed codes (empty, non-digit, wrong length)', () => {
    expect(verifyTOTP(RFC_SECRET, '')).toBeNull();
    expect(verifyTOTP(RFC_SECRET, 'abcdef')).toBeNull();
    expect(verifyTOTP(RFC_SECRET, '12345')).toBeNull();
    expect(verifyTOTP(RFC_SECRET, '1234567')).toBeNull();
  });

  it('accepts the RFC 6238 reference code at the matching time step', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59 * 1000)); // T = 59s → step 1
    expect(verifyTOTP(RFC_SECRET, '287082')).toBe(1);
  });

  it('rejects a wrong code at a valid time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59 * 1000));
    expect(verifyTOTP(RFC_SECRET, '000000')).toBeNull();
  });

  it('tolerates ±1 step of clock drift', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(89 * 1000)); // step 2; step-1 code must still pass via -1 drift
    expect(verifyTOTP(RFC_SECRET, '287082')).toBe(1);
  });

  it('returns the time-step counter so callers can block replay', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59 * 1000));
    const step = verifyTOTP(RFC_SECRET, '287082');
    expect(typeof step).toBe('number');
    expect(step).toBeGreaterThan(0);
  });
});

describe('buildOtpAuthUri', () => {
  it('produces a scannable otpauth:// URI with the expected params', () => {
    const uri = buildOtpAuthUri('SECRET234', 'admin@donow.co.in');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=SECRET234');
    expect(uri).toContain('issuer=Donow');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
    // label is URL-encoded "Donow:admin@donow.co.in"
    expect(uri).toContain('Donow%3Aadmin%40donow.co.in');
  });
});
