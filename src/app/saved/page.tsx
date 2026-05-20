'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getSavedDonationsByIds, toggleSavedDonation } from '@/lib/donations';
import { CATEGORIES } from '@/constants/config';
import { Button } from '@/components/common/Button';
import { Donation } from '@/types';

function getCategoryName(id: Donation['category']) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';
}

export default function SavedPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [fetching, setFetching] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  useEffect(() => {
    if (!user) return;
    const ids = user.savedDonations ?? [];
    if (ids.length === 0) { setDonations([]); return; }
    setFetching(true);
    getSavedDonationsByIds(ids)
      .then(setDonations)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  const handleRemove = async (donationId: string) => {
    if (!user) return;
    setRemovingId(donationId);
    try {
      await toggleSavedDonation(user.uid, donationId, false);
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
    } finally {
      setRemovingId(null);
    }
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Saved Donations</h1>

        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        ) : donations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-white py-20 shadow text-center">
            <p className="text-5xl mb-4">🔖</p>
            <h2 className="text-xl font-semibold text-gray-800">No saved donations</h2>
            <p className="mt-2 text-gray-500">Tap the heart on any donation to save it here.</p>
            <Link href="/donations" className="mt-6">
              <Button>Browse Donations</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {donations.map((donation) => (
              <div
                key={donation.id}
                className="overflow-hidden rounded-lg bg-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={`/donations/${donation.id}`}>
                  <div
                    className="h-48 bg-gray-200 bg-cover bg-center"
                    style={{ backgroundImage: donation.images[0] ? `url(${donation.images[0]})` : undefined }}
                  />
                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                        {getCategoryName(donation.category)}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold capitalize text-gray-700">
                        {donation.condition}
                      </span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-bold text-gray-900">{donation.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{donation.description}</p>
                    <p className="mt-3 text-sm text-gray-500">{donation.location.city}</p>
                  </div>
                </Link>
                <div className="px-5 pb-4">
                  <button
                    onClick={() => handleRemove(donation.id)}
                    disabled={removingId === donation.id}
                    className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 transition"
                  >
                    {removingId === donation.id ? 'Removing…' : '🗑 Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
