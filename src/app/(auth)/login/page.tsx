'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/hooks/useAuth';
import { isLoginLink } from '@/lib/auth';
import Link from 'next/link';

type Step = 'password' | 'magic-email' | 'sent' | 'confirm-email' | 'completing';

export default function LoginPage() {
  const router = useRouter();
  const { login, sendLoginLink, completeLogin, loading, error } = useAuth();

  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  // Detect if the page was opened via a magic link in the URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoginLink(window.location.href)) return;

    const saved = localStorage.getItem('emailForSignIn');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(saved);
      setStep('completing');
      completeLogin(saved, window.location.href)
        .then(() => router.push('/dashboard'))
        .catch(() => setStep('password'));
    } else {
      setStep('confirm-email');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      // error shown from store
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    try {
      await sendLoginLink(email);
      setStep('sent');
    } catch {
      // error shown from store
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(confirmEmail)) {
      setEmailError('Enter your email');
      return;
    }
    setStep('completing');
    completeLogin(confirmEmail, window.location.href)
      .then(() => router.push('/dashboard'))
      .catch(() => setStep('password'));
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
          <p className="mt-1 text-sm text-gray-500">
            Click the link in the email to sign in. The link expires in 1 hour.
          </p>
          <p className="mt-3 text-xs text-gray-400">
            If you don&apos;t see it, check your Spam or Promotions folder.
          </p>
          <button
            onClick={() => setStep('password')}
            className="mt-6 text-sm text-teal-600 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (step === 'magic-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-teal-600 mb-1">Sign in with link</h1>
          <p className="text-gray-500 text-sm mb-6">
            We&apos;ll email you a one-time login link — no password needed.
          </p>

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSendLink} className="space-y-4">
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

          <div className="mt-4 text-center text-sm text-gray-600">
            <button
              onClick={() => { setStep('password'); setEmailError(''); }}
              className="text-teal-600 hover:underline font-medium"
            >
              Back to password login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: email + password login
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-1">Welcome Back</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your Donow account</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={emailError}
            required
          />
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={passwordError}
              required
            />
            <div className="mt-1 text-right">
              <Link href="/forgot-password" className="text-xs text-teal-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-gray-600">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-teal-600 font-semibold hover:underline">Sign up</Link>
          </p>
          <p>
            <button
              onClick={() => { setStep('magic-email'); setEmailError(''); setPasswordError(''); }}
              className="text-gray-400 hover:text-teal-600 hover:underline text-xs"
            >
              Sign in without password
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
