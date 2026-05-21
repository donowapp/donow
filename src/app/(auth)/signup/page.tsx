'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/hooks/useAuth';
import { resendVerificationEmail } from '@/lib/auth';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading, error } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) errors.email = 'Email is required';
    if (!formData.email.includes('@')) errors.email = 'Valid email is required';

    if (!formData.password) errors.password = 'Password is required';
    if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.name) errors.name = 'Name is required';
    if (!formData.phone) errors.phone = 'Phone is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.address) errors.address = 'Address is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await signup(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      });
      setVerificationSent(true);
    } catch (err) {
      console.error('Signup error:', err);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      await resendVerificationEmail();
      setResendMessage('Verification email sent again. Check your inbox.');
    } catch {
      setResendMessage('Could not resend. Please try again in a minute.');
    } finally {
      setResendLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <span className="text-5xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600 mb-1">
            We sent a verification link to
          </p>
          <p className="font-semibold text-teal-600 mb-6">{formData.email}</p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to verify your account. You can still use the app while waiting.
          </p>

          {resendMessage && (
            <p className="mb-4 text-sm text-teal-700 bg-teal-50 rounded px-3 py-2">{resendMessage}</p>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Continue to Dashboard
            </Button>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-teal-600 hover:underline disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : "Didn't receive it? Resend email"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-2">Create Account</h1>
        <p className="text-gray-600 mb-6">Join Donow and start donating today</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            error={validationErrors.name}
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            error={validationErrors.email}
            required
          />

          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="9876543210"
            error={validationErrors.phone}
            required
          />

          <Input
            label="Address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main Street"
            error={validationErrors.address}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Mumbai"
              error={validationErrors.city}
              required
            />

            <Input
              label="State"
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>

          <Input
            label="Pincode"
            type="text"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            placeholder="400001"
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            error={validationErrors.password}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            error={validationErrors.confirmPassword}
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <p className="text-center text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
