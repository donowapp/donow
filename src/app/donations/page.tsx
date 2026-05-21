'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { CATEGORIES, CONDITIONS } from '@/constants/config';
import { getActiveDonations, toggleSavedDonation } from '@/lib/donations';
import { useAuth } from '@/hooks/useAuth';
import { Donation } from '@/types';

function getCategoryName(categoryId: Donation['category']) {
  return CATEGORIES.find((c) => c.id === categoryId)?.name ?? 'Other';
}

function DonationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');
  const [city, setCity] = useState('all');
  const [condition, setCondition] = useState('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    getActiveDonations()
      .then((activeDonations) => { if (isMounted) setDonations(activeDonations); })
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Could not load donations.');
      })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    setSavedIds(new Set(user?.savedDonations ?? []));
  }, [user]);

  const handleToggleSave = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const newSaved = !savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      newSaved ? next.add(id) : next.delete(id);
      return next;
    });
    try {
      await toggleSavedDonation(user.uid, id, newSaved);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        newSaved ? next.delete(id) : next.add(id);
        return next;
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearch(val), 300);
  };

  const cities = useMemo(
    () =>
      Array.from(new Set(donations.map((d) => d.location.city.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [donations]
  );

  const filteredDonations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter((d) => {
      const matchesSearch = !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || d.category === category;
      const matchesCity = city === 'all' || d.location.city === city;
      const matchesCondition = condition === 'all' || d.condition === condition;
      return matchesSearch && matchesCategory && matchesCity && matchesCondition;
    });
  }, [category, city, condition, donations, search]);

  return (
    <div className="bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Donations</h1>
            <p className="mt-2 text-gray-600">Find available items and connect with donors directly.</p>
          </div>
          <Link href="/create-donation">
            <Button>Donate an Item</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="filter-search" className="mb-2 block text-sm font-semibold text-gray-700">Search</label>
              <input
                id="filter-search"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Title or description"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label htmlFor="filter-category" className="mb-2 block text-sm font-semibold text-gray-700">Category</label>
              <select
                id="filter-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-city" className="mb-2 block text-sm font-semibold text-gray-700">City</label>
              <select
                id="filter-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-condition" className="mb-2 block text-sm font-semibold text-gray-700">Condition</label>
              <select
                id="filter-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 capitalize outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All conditions</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {!loading && !error && filteredDonations.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h2 className="text-xl font-semibold text-gray-900">No donations found</h2>
            <p className="mt-2 text-gray-600">Try changing filters or create the first donation in this area.</p>
          </div>
        )}

        {!loading && !error && filteredDonations.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredDonations.map((donation) => (
              <div
                key={donation.id}
                className="relative overflow-hidden rounded-lg bg-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
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
                    <h2 className="line-clamp-2 text-xl font-bold text-gray-900">{donation.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-gray-600">{donation.description}</p>
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

                {/* Save heart button */}
                {user && (
                  <button
                    onClick={(e) => handleToggleSave(e, donation.id)}
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow text-lg backdrop-blur-sm transition hover:scale-110"
                    aria-label={savedIds.has(donation.id) ? 'Unsave' : 'Save'}
                  >
                    {savedIds.has(donation.id) ? '❤️' : '🤍'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DonationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    }>
      <DonationsContent />
    </Suspense>
  );
}
