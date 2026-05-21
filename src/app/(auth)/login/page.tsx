'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/hooks/useAuth';
import { isLoginLink } from '@/lib/auth';
import Link from 'next/link';

type Step = 'email' | 'sent' | 'confirm-email' | 'completing';

export default function LoginPage() {
  const router = useRouter();
  const { sendLoginLink, completeLogin, loading, error } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  // Detect if page was opened via a magic link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoginLink(window.location.href)) return;

    const saved = localStorage.getItem('emailForSignIn');
    if (saved) {
      setEmail(saved);
      setStep('completing');
      completeLogin(saved, window.location.href)
        .then(() => router.push('/dashboard'))
        .catch(() => setStep('email'));
    } else {
      setStep('confirm-email');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!email.includes('@')) { setEmailError('Enter a valid email address'); return; }
    try {
      await sendLoginLink(email);
      setStep('sent');
    } catch {
      // error shown from store
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmEmail.includes('@')) { setEmailError('Enter your email'); return; }
    setStep('completing');
    completeLogin(confirmEmail, window.location.href)
      .then(() => router.push('/dashboard'))
      .catch(() => { setStep('email'); });
  };

  if (step === 'completing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4" />
          <p className="text-gray-600">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (step === 'confirm-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-teal-600 mb-2">Confirm your email</h1>
          <p className="text-gray-500 text-sm mb-6">
            You opened this login link on a different device. Please enter your email to continue.
          </p>
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleConfirmEmail} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="you@example.com"
              error={emailError}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Continue'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <span className="text-5xl">📬</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Check your inbox</h1>
          <p className="mt-2 text-gray-600">
            We sent a login link to{' '}
            <span className="font-semibold text-teal-600">{email}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">Click the link in the email to sign in. The link expires in 1 hour.</p>
          <button
            onClick={() => setStep('email')}
            className="mt-6 text-sm text-teal-600 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-1">Welcome Back</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your email — we'll send you a login link</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={emailError}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Send Login Link'}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-gray-600">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-teal-600 font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
