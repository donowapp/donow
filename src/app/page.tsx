'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { getFeaturedDonations } from '@/lib/donations';
import { CATEGORIES } from '@/constants/config';
import { Donation } from '@/types';

function getCategoryName(id: Donation['category']) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';
}

export default function Home() {
  const [featured, setFeatured] = useState<Donation[]>([]);

  useEffect(() => {
    getFeaturedDonations(8).then(setFeatured).catch(() => {});
  }, []);

  return (
    <main className="bg-gray-50">
      {/* Hero */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold text-gray-900">Donow</h1>
            <p className="mt-4 text-xl text-gray-700">
              Donate unused items to people who can use them today.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/create-donation">
                <Button size="lg">Create Donation</Button>
              </Link>
              <Link href="/donations">
                <Button size="lg" variant="outline">Browse Donations</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Donations Carousel */}
      {featured.length > 0 && (
        <section className="border-t bg-white px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Featured Donations</h2>
              <Link href="/donations" className="text-sm font-semibold text-teal-600 hover:text-teal-800">
                View all →
              </Link>
            </div>
            <div
              className="flex gap-4 overflow-x-auto pb-3"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {featured.map((donation) => (
                <Link
                  key={donation.id}
                  href={`/donations/${donation.id}`}
                  className="flex-shrink-0 w-56 rounded-lg border bg-gray-50 overflow-hidden hover:shadow-md transition"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="h-36 bg-gray-200 bg-cover bg-center"
                    style={{ backgroundImage: donation.images[0] ? `url(${donation.images[0]})` : undefined }}
                  />
                  <div className="p-3">
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-700">
                      {getCategoryName(donation.category)}
                    </span>
                    <h3 className="mt-2 line-clamp-2 text-sm font-bold text-gray-900">
                      {donation.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">{donation.location.city}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by Category */}
      <section className="border-t bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Browse by Category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/donations?category=${cat.id}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-white px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-lg border p-5">
            <h2 className="text-lg font-bold text-gray-900">Post Items</h2>
            <p className="mt-2 text-sm text-gray-600">
              Add photos, category, condition, pickup city, and a clear description.
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <h2 className="text-lg font-bold text-gray-900">Find Donations</h2>
            <p className="mt-2 text-sm text-gray-600">
              Search and filter available donations by need, location, and condition.
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <h2 className="text-lg font-bold text-gray-900">Contact Donors</h2>
            <p className="mt-2 text-sm text-gray-600">
              Open a donation, message the donor, and coordinate pickup directly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
