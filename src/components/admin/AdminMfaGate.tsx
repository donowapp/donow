'use client';

import { useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';

type Phase = 'loading' | 'enroll' | 'verify' | 'done';

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token ?? ''}` },
  });
}

/**
 * Gates the admin panel behind an app-level TOTP second factor. While the admin
 * is unverified it renders an enrollment or code-entry screen; once a valid
 * code is accepted (and the MFA session cookie is set) it renders {children}.
 */
export function AdminMfaGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const beginEnroll = useCallback(async () => {
    const res = await authedFetch('/api/admin/totp/setup', { method: 'POST' });
    const data = await res.json();
    if (data.alreadyEnrolled) { setPhase('verify'); return; }
    setQr(data.qr ?? null);
    setSecret(data.secret ?? null);
    setPhase('enroll');
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authedFetch('/api/admin/totp/status');
        if (!res.ok) throw new Error();
        const data = await res.json() as { enrolled?: boolean; verified?: boolean };
        if (!mounted) return;
        if (data.verified) setPhase('done');
        else if (data.enrolled) setPhase('verify');
        else await beginEnroll();
      } catch {
        if (mounted) setError('Could not load two-factor status. Refresh to retry.');
      }
    })();
    return () => { mounted = false; };
  }, [beginEnroll]);

  const submitCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch('/api/admin/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Invalid code.');
      }
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code.');
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'done') return <>{children}</>;

  if (phase === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Admin two-factor</h1>

        {phase === 'enroll' && (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Protect the admin panel with an authenticator app (Google Authenticator, Authy, 1Password…).
              Scan this QR code, then enter the 6-digit code to finish setup.
            </p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="2FA QR code" className="mx-auto my-4 h-44 w-44" />
            )}
            {secret && (
              <p className="mb-4 break-all text-center text-xs text-gray-500">
                Or enter this key manually: <span className="font-mono text-gray-700">{secret}</span>
              </p>
            )}
          </>
        )}

        {phase === 'verify' && (
          <p className="mt-2 text-sm text-gray-600">
            Enter the current 6-digit code from your authenticator app to access the admin panel.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) submitCode(); }}
          placeholder="123456"
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={submitCode}
          disabled={code.length !== 6 || busy}
          className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Verifying…' : phase === 'enroll' ? 'Verify & enable' : 'Verify'}
        </button>
      </div>
    </div>
  );
}
