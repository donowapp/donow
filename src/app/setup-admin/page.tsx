'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

export default function SetupAdminPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!user) return null;

  const isEligible = ADMIN_EMAIL
    ? user.email === ADMIN_EMAIL
    : true;

  if (user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already an Admin</h1>
          <p className="text-gray-500 mb-6">Your account already has admin privileges.</p>
          <button
            onClick={() => router.push('/admin')}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
          >
            Go to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <p className="text-4xl mb-4">🚫</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Authorized</h1>
          <p className="text-gray-500">This page is restricted to the site owner.</p>
        </div>
      </div>
    );
  }

  const handleMakeAdmin = async () => {
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
      await checkAuth();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set admin role.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Role Set!</h1>
          <p className="text-gray-500 mb-6">You now have admin access to Donow.</p>
          <button
            onClick={() => router.push('/admin')}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
          >
            Go to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <p className="text-4xl mb-4">🔐</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Setup</h1>
        <p className="text-gray-500 mb-2">Signed in as</p>
        <p className="font-semibold text-sky-700 mb-6">{user.email}</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        )}

        <button
          onClick={handleMakeAdmin}
          disabled={saving}
          className="w-full rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition"
        >
          {saving ? 'Setting up…' : 'Make Me Admin'}
        </button>
        <p className="mt-4 text-xs text-gray-400">
          This page is only accessible to the site owner&apos;s email address.
        </p>
      </div>
    </div>
  );
}
