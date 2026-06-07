'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@/lib/analytics';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('t') ?? '';

  const [state, setState] = useState<State>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    // One-time token validation on mount; setting state here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!token) { setState('error'); setErrMsg('Verification link is missing.'); return; }

    // The server validates the token AND marks the account verified (emailConfirmed).
    // Possession of the emailed token is sufficient proof of inbox ownership.
    fetch('/api/auth/validate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Invalid or expired verification link.');
        track('email_verified', {});
        setState('success');
        setTimeout(() => router.replace('/login'), 3000);
      })
      .catch((e) => { setState('error'); setErrMsg(e.message); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">

        {/* Loading */}
        {state === 'loading' && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Verifying your email…</p>
          </>
        )}

        {/* Success */}
        {state === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h1>
            <p className="text-gray-500 mb-6">Your account is now active. Redirecting to login…</p>
            <Link href="/login" className="text-teal-600 text-sm hover:underline">
              Go to Login →
            </Link>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link invalid or expired</h1>
            <p className="text-sm text-gray-500 mb-6">{errMsg || 'Please sign up again or request a new verification email.'}</p>
            <Link href="/signup" className="inline-block bg-teal-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-teal-700">
              Back to Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
