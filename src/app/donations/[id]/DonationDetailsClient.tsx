'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { CATEGORIES } from '@/constants/config';
import { getDonationById, getDonorById } from '@/lib/donations';
import { Donation, User } from '@/types';

interface DonationDetailsClientProps {
  donationId: string;
}

function getCategoryName(categoryId: Donation['category']) {
  return (
    CATEGORIES.find((category) => category.id === categoryId)?.name ?? 'Other'
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getContactHref(donation: Donation, donor: User | null) {
  if (!donor) return null;

  if (donor.email) {
    const subject = encodeURIComponent(`Interested in ${donation.title}`);
    const body = encodeURIComponent(
      `Hi ${donor.name || 'there'},\n\nI found your donation "${donation.title}" on Donow and would like to connect.\n\nThanks.`
    );

    return `mailto:${donor.email}?subject=${subject}&body=${body}`;
  }

  if (donor.phone) return `tel:${donor.phone}`;

  return null;
}

export default function DonationDetailsClient({
  donationId,
}: DonationDetailsClientProps) {
  const [donation, setDonation] = useState<Donation | null>(null);
  const [donor, setDonor] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getDonationById(donationId)
      .then(async (loadedDonation) => {
        if (!isMounted) return;

        if (!loadedDonation) {
          setError('Donation not found.');
          return;
        }

        setDonation(loadedDonation);
        setSelectedImage(loadedDonation.images[0] ?? '');

        const loadedDonor = await getDonorById(loadedDonation.userId);
        if (isMounted) setDonor(loadedDonor);
      })
      .catch((loadError) => {
        console.error('Load donation details error:', loadError);
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load donation details.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [donationId]);

  const contactHref = useMemo(
    () => (donation ? getContactHref(donation, donor) : null),
    [donation, donor]
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-600">Loading donation...</p>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="min-h-[60vh] bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-gray-900">
            {error ?? 'Donation not found.'}
          </h1>
          <Link href="/donations" className="mt-4 inline-block">
            <Button>Browse Donations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/donations" className="text-sm font-semibold text-teal-700">
            Back to donations
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <div
              className="h-[420px] rounded-lg bg-gray-200 bg-cover bg-center shadow"
              style={{
                backgroundImage: selectedImage ? `url(${selectedImage})` : undefined,
              }}
            />

            {donation.images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {donation.images.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => setSelectedImage(imageUrl)}
                    className={`h-20 rounded border bg-cover bg-center ${
                      selectedImage === imageUrl
                        ? 'border-teal-600 ring-2 ring-teal-200'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundImage: `url(${imageUrl})` }}
                    aria-label="View donation image"
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                  {getCategoryName(donation.category)}
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold capitalize text-gray-700">
                  {donation.condition}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900">
                {donation.title}
              </h1>
              <p className="mt-4 whitespace-pre-wrap text-gray-700">
                {donation.description}
              </p>

              <div className="mt-6 space-y-3 border-t pt-5 text-sm text-gray-700">
                <div>
                  <span className="font-semibold text-gray-900">City: </span>
                  {donation.location.city}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">
                    Pickup address:{' '}
                  </span>
                  {donation.location.address}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Posted: </span>
                  {formatDate(donation.createdAt)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Views: </span>
                  {donation.viewCount}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-gray-900">Donor Info</h2>
              {donor ? (
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold text-gray-900">Name: </span>
                    {donor.name || 'Donor'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">City: </span>
                    {donor.city || donation.location.city}
                  </div>
                  {donor.email && (
                    <div className="break-all">
                      <span className="font-semibold text-gray-900">Email: </span>
                      {donor.email}
                    </div>
                  )}
                  {donor.phone && (
                    <div>
                      <span className="font-semibold text-gray-900">Phone: </span>
                      {donor.phone}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">
                  Donor profile details are not available yet.
                </p>
              )}

              {contactHref ? (
                <a href={contactHref} className="mt-5 block">
                  <Button className="w-full">Contact Donor</Button>
                </a>
              ) : (
                <Button disabled className="mt-5 w-full">
                  Contact Unavailable
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
