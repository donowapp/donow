'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getMyDonations, markDonationCompleted, deleteDonation } from '@/lib/donations';
import { cld } from '@/lib/cld';
import { track } from '@/lib/analytics';
import { captureError } from '@/lib/crash';
import { Button } from '@/components/common/Button';
import { Donation } from '@/types';

const STATUS_STYLES: Record<Donation['status'], string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
};

export default function MyDonationsPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => {
      if (isMounted) setCheckingAuth(false);
    });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) {
      router.push('/login');
    }
  }, [checkingAuth, loading, router, user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true);
    getMyDonations(user.uid)
      .then(setDonations)
      .catch(() => setError('Could not load your donations.'))
      .finally(() => setFetching(false));
  }, [user]);

  const handleMarkComplete = async (id: string) => {
    setActionId(id);
    try {
      await markDonationCompleted(id);
      track('donation_completed', { donationId: id });
      setDonations((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'completed' as const } : d))
      );
    } catch (e) {
      captureError(e, { action: 'markComplete', donationId: id });
      setError('Could not mark donation as completed.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this donation? This cannot be undone.')) return;
    setActionId(id);
    try {
      await deleteDonation(id);
      setDonations((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Could not delete donation.');
    } finally {
      setActionId(null);
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
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Donations</h1>
            <p className="mt-1 text-gray-500">Items you have posted for donation</p>
          </div>
          <Link href="/create-donation">
            <Button>+ New Donation</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        ) : donations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-white py-20 shadow text-center">
            <p className="text-5xl mb-4">📦</p>
            <h2 className="text-xl font-semibold text-gray-800">No donations yet</h2>
            <p className="mt-2 text-gray-500">Start by posting your first item.</p>
            <Link href="/create-donation" className="mt-6">
              <Button>Create Donation</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {donations.map((donation) => (
              <div
                key={donation.id}
                className="flex gap-4 rounded-lg bg-white p-4 shadow"
              >
                {/* Thumbnail */}
                <div className="hidden sm:block w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {donation.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cld(donation.images[0], 200)}
                      alt={donation.title}
                      width={96}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl">
                      📷
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-semibold text-gray-900 truncate">{donation.title}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[donation.status]}`}>
                        {donation.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 capitalize">
                      {donation.category} · {donation.condition} · {donation.location.city}
                    </p>
                    <div className="mt-1 flex gap-4 text-xs text-gray-400">
                      <span>{donation.viewCount} views</span>
                      <span>{donation.interestedUsers.length} interested</span>
                      <span>{donation.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Completion reminder: nudges the donor to close the loop so the
                      recipient can review (reviews require status === 'completed'). */}
                  {donation.status === 'active' && donation.interestedUsers.length > 0 && (
                    <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      💡 Already gave this away? Tap <span className="font-semibold">Mark Complete</span> so the recipient can leave you a review.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/donations/${donation.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                    {donation.status === 'active' && (
                      <Link href={`/my-donations/${donation.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    )}
                    {donation.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionId === donation.id}
                        onClick={() => handleMarkComplete(donation.id)}
                      >
                        {actionId === donation.id ? 'Saving…' : 'Mark Complete'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionId === donation.id}
                      onClick={() => handleDelete(donation.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
