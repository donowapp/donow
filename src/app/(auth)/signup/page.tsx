'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/hooks/useAuth';
import { resendVerificationEmail } from '@/lib/auth';
import { track } from '@/lib/analytics';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading, error } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    let ok = true;
    setNameError(''); setEmailError(''); setPasswordError('');
    if (!form.name.trim()) { setNameError('Name is required'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setEmailError('Enter a valid email address'); ok = false; }
    if (form.password.length < 6) { setPasswordError('Minimum 6 characters'); ok = false; }
    return ok;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await signup(form.email, form.password, { name: form.name.trim(), phone: form.phone.trim() });
      track('sign_up', {});
      setVerificationSent(true);
    } catch {
      // error shown from store
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      await resendVerificationEmail();
      setResendMessage('Verification email sent. Check your inbox.');
    } catch {
      setResendMessage('Could not resend. Try again in a minute.');
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <span className="text-5xl">📧</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-gray-600">
            We sent a verification link to{' '}
            <span className="font-semibold text-teal-600">{form.email}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">Please verify your email to start using Donow — you&apos;ll need to confirm the link before you can log in.</p>

          {resendMessage && (
            <p className="mt-4 text-sm text-teal-700 bg-teal-50 rounded px-3 py-2">{resendMessage}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-teal-600 hover:underline disabled:opacity-50"
            >
              {resendLoading ? 'Sending…' : "Didn't receive it? Resend"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-1">Create Account</h1>
        <p className="text-gray-500 mb-6 text-sm">Join Donow and start donating today</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Rahul Sharma"
            error={nameError}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@example.com"
            error={emailError}
            required
          />
          <Input
            label="Mobile Number (optional)"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+91 98765 43210"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="••••••••"
            error={passwordError}
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
