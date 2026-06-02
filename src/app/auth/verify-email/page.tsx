'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';

type State = 'loading' | 'need-login' | 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('t') ?? '';

  const [state, setState] = useState<State>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [uid, setUid] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  async function validateToken(t: string) {
    const res = await fetch('/api/auth/validate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    });
    if (!res.ok) throw new Error('Invalid or expired verification link.');
    return res.json() as Promise<{ uid: string; email: string }>;
  }

  async function confirmVerification(resolvedUid: string) {
    setState('verifying');
    await updateDoc(doc(db, 'users', resolvedUid), { emailConfirmed: true, updatedAt: new Date() });
    setState('success');
    setTimeout(() => router.replace('/login'), 3000);
  }

  useEffect(() => {
    if (!token) { setState('error'); setErrMsg('Verification link is missing.'); return; }

    validateToken(token)
      .then(({ uid: resolvedUid, email }) => {
        setUid(resolvedUid);
        setLoginEmail(email);
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === resolvedUid) {
          confirmVerification(resolvedUid);
        } else {
          setState('need-login');
        }
      })
      .catch((e) => { setState('error'); setErrMsg(e.message); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      if (user.uid !== uid) { setLoginErr('This link belongs to a different account.'); return; }
      await confirmVerification(uid);
    } catch {
      setLoginErr('Incorrect password. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">

        {/* Loading */}
        {state === 'loading' && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Validating your link…</p>
          </>
        )}

        {/* Need to sign in first */}
        {state === 'need-login' && (
          <>
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Confirm it's you</h1>
            <p className="text-sm text-gray-500 mb-6">
              Enter your password to complete email verification for<br />
              <span className="font-semibold text-teal-700">{loginEmail}</span>
            </p>
            <form onSubmit={handleLogin} className="text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {loginErr && <p className="text-sm text-red-600">{loginErr}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60"
              >
                {loginLoading ? 'Verifying…' : 'Verify Email'}
              </button>
            </form>
          </>
        )}

        {/* Verifying */}
        {state === 'verifying' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-600">Activating your account…</p>
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
