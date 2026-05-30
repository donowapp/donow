/**
 * User dashboard
 * Protected page - only logged-in users can access
 */

'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check auth on mount
  useEffect(() => {
    let isMounted = true;

    checkAuth().finally(() => {
      if (isMounted) setCheckingAuth(false);
    });

    return () => {
      isMounted = false;
    };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) {
      router.push('/login');
    }
  }, [checkingAuth, loading, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (checkingAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user.name}!</h1>
            <p className="text-gray-600">Manage your donations and account</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Donations Given */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Donations Given</p>
                <p className="text-3xl font-bold text-sky-600 mt-2">{user.donationCount || 0}</p>
              </div>
              <div className="text-4xl">🎁</div>
            </div>
          </div>

          {/* Items Received */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Items Received</p>
                <p className="text-3xl font-bold text-sky-600 mt-2">{user.receivedCount || 0}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Your Rating</p>
                <p className="text-3xl font-bold text-sky-600 mt-2">{(user.rating || 0).toFixed(1)}</p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Full Name</p>
              <p className="text-lg font-semibold text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Email</p>
              <p className="text-lg font-semibold text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Phone</p>
              <p className="text-lg font-semibold text-gray-900">{user.phone}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">City</p>
              <p className="text-lg font-semibold text-gray-900">{user.city}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-600 text-sm">Address</p>
              <p className="text-lg font-semibold text-gray-900">{user.address}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/donations">
            <Button className="w-full bg-sky-600 hover:bg-sky-700">
              Browse Donations
            </Button>
          </Link>
          <Link href="/create-donation">
            <Button className="w-full bg-sky-600 hover:bg-sky-700">
              Create Donation
            </Button>
          </Link>
          <Link href="/profile">
            <Button className="w-full bg-sky-600 hover:bg-sky-700">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
