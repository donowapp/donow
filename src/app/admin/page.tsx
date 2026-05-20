'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);

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
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-10 shadow text-center">
          <p className="text-5xl mb-4">🚫</p>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-500">Manage donations, users, and reports.</p>
      </div>
    </div>
  );
}
