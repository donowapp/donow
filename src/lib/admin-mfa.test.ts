import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sign } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { issueMfaToken, hasValidMfa, MFA_COOKIE } from './admin-mfa';

// Snapshot/restore the env keys the MFA helpers read, so tests don't leak.
const ENV_KEYS = ['ADMIN_MFA_SECRET', 'ADMIN_MFA_SECRET_OLD', 'EMAIL_JWT_SECRET'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.ADMIN_MFA_SECRET = 'current-secret-xyz';
  delete process.env.ADMIN_MFA_SECRET_OLD;
  process.env.EMAIL_JWT_SECRET = 'legacy-email-secret';
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function reqWithCookie(value?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (value !== undefined) headers.cookie = `${MFA_COOKIE}=${value}`;
  return new NextRequest('https://donow.co.in/api/admin/x', { headers });
}

describe('admin MFA session cookie', () => {
  it('accepts a freshly issued token for the same uid', () => {
    const token = issueMfaToken('uid-A');
    expect(hasValidMfa(reqWithCookie(token), 'uid-A')).toBe(true);
  });

  it('rejects a valid token presented for a different uid', () => {
    const token = issueMfaToken('uid-A');
    expect(hasValidMfa(reqWithCookie(token), 'uid-B')).toBe(false);
  });

  it('rejects when no cookie is present', () => {
    expect(hasValidMfa(reqWithCookie(undefined), 'uid-A')).toBe(false);
  });

  it('rejects a garbage / non-JWT cookie', () => {
    expect(hasValidMfa(reqWithCookie('not-a-jwt'), 'uid-A')).toBe(false);
  });

  it('rejects a token with the wrong purpose claim', () => {
    const forged = sign({ uid: 'uid-A', purpose: 'email_verify' }, 'current-secret-xyz');
    expect(hasValidMfa(reqWithCookie(forged), 'uid-A')).toBe(false);
  });

  it('rejects a token signed with an unknown secret', () => {
    const forged = sign({ uid: 'uid-A', purpose: 'admin_mfa' }, 'attacker-secret');
    expect(hasValidMfa(reqWithCookie(forged), 'uid-A')).toBe(false);
  });

  it('still accepts tokens signed with the previous secret during rotation', () => {
    // Simulate: secret rotated; an in-flight cookie was signed with the old one.
    const oldToken = sign({ uid: 'uid-A', purpose: 'admin_mfa' }, 'old-secret-prev');
    process.env.ADMIN_MFA_SECRET_OLD = 'old-secret-prev';
    expect(hasValidMfa(reqWithCookie(oldToken), 'uid-A')).toBe(true);
  });

  it('accepts legacy cookies signed with EMAIL_JWT_SECRET (backward compat)', () => {
    const legacy = sign({ uid: 'uid-A', purpose: 'admin_mfa' }, 'legacy-email-secret');
    expect(hasValidMfa(reqWithCookie(legacy), 'uid-A')).toBe(true);
  });
});
