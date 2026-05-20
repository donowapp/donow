'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { CATEGORIES, CONDITIONS } from '@/constants/config';
import { getActiveDonations } from '@/lib/donations';
import { Donation } from '@/types';

function getCategoryName(categoryId: Donation['category']) {
  return (
    CATEGORIES.find((category) => category.id === categoryId)?.name ?? 'Other'
  );
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('all');
  const [condition, setCondition] = useState('all');

  useEffect(() => {
    let isMounted = true;

    getActiveDonations()
      .then((activeDonations) => {
        if (isMounted) setDonations(activeDonations);
      })
      .catch((loadError) => {
        console.error('Load donations error:', loadError);
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load donations.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          donations
            .map((donation) => donation.location.city.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [donations]
  );

  const filteredDonations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return donations.filter((donation) => {
      const matchesSearch =
        !normalizedSearch ||
        donation.title.toLowerCase().includes(normalizedSearch) ||
        donation.description.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        category === 'all' || donation.category === category;
      const matchesCity = city === 'all' || donation.location.city === city;
      const matchesCondition =
        condition === 'all' || donation.condition === condition;

      return (
        matchesSearch && matchesCategory && matchesCity && matchesCondition
      );
    });
  }, [category, city, condition, donations, search]);

  return (
    <div className="bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Donations</h1>
            <p className="mt-2 text-gray-600">
              Find available items and connect with donors directly.
            </p>
          </div>
          <Link href="/create-donation">
            <Button>Donate an Item</Button>
          </Link>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Search
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title or description"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((categoryOption) => (
                  <option key={categoryOption.id} value={categoryOption.id}>
                    {categoryOption.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                City
              </label>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All cities</option>
                {cities.map((cityOption) => (
                  <option key={cityOption} value={cityOption}>
                    {cityOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Condition
              </label>
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 capitalize outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All conditions</option>
                {CONDITIONS.map((conditionOption) => (
                  <option key={conditionOption} value={conditionOption}>
                    {conditionOption}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">Loading donations...</p>
          </div>
        )}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filteredDonations.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h2 className="text-xl font-semibold text-gray-900">
              No donations found
            </h2>
            <p className="mt-2 text-gray-600">
              Try changing filters or create the first donation in this area.
            </p>
          </div>
        )}

        {!loading && !error && filteredDonations.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredDonations.map((donation) => (
              <Link
                key={donation.id}
                href={`/donations/${donation.id}`}
                className="overflow-hidden rounded-lg bg-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-48 bg-gray-200 bg-cover bg-center"
                  style={{
                    backgroundImage: donation.images[0]
                      ? `url(${donation.images[0]})`
                      : undefined,
                  }}
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
                  <h2 className="line-clamp-2 text-xl font-bold text-gray-900">
                    {donation.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                    {donation.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>{donation.location.city}</span>
                    <div className="flex gap-3">
                      <span>{donation.viewCount} views</span>
                      {donation.interestedUsers.length > 0 && (
                        <span className="text-teal-600 font-medium">
                          {donation.interestedUsers.length} interested
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
