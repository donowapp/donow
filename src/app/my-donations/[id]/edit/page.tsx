'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { CATEGORIES, CONDITIONS } from '@/constants/config';
import { getDonationById, updateDonation } from '@/lib/donations';
import { useAuth } from '@/hooks/useAuth';
import { Donation } from '@/types';

export default function EditDonationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, checkAuth } = useAuth();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '' as Donation['category'],
    condition: '' as Donation['condition'],
    address: '',
    city: '',
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!id) return;
    getDonationById(id)
      .then((d) => {
        if (!d) { setError('Donation not found.'); return; }
        setDonation(d);
        setForm({
          title: d.title,
          description: d.description,
          category: d.category,
          condition: d.condition,
          address: d.location.address,
          city: d.location.city,
        });
      })
      .catch(() => setError('Could not load donation.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && donation && user && user.uid !== donation.userId) {
      router.push('/my-donations');
    }
  }, [loading, donation, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.city.trim()) {
      setError('Title, description, and city are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateDonation(id, form);
      router.push('/my-donations');
    } catch {
      setError('Could not save changes. Please try again.');
      setSaving(false);
    }
  };

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error && !donation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <Link href="/my-donations" className="mt-4 inline-block text-teal-600 hover:underline">
            Back to My Donations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Donation</h1>
            <p className="mt-1 text-gray-500">Update your donation details</p>
          </div>
          <Link href="/my-donations" className="text-sm font-semibold text-teal-700">
            ← My Donations
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Title"
            value={form.title}
            onChange={set('title')}
            placeholder="What are you donating?"
            required
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={4}
              placeholder="Describe the item, its condition, and any important details…"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={set('category')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Condition</label>
              <select
                value={form.condition}
                onChange={set('condition')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 capitalize outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Pickup Address"
            value={form.address}
            onChange={set('address')}
            placeholder="Street, area, landmark"
          />

          <Input
            label="City"
            value={form.city}
            onChange={set('city')}
            placeholder="Mumbai"
            required
          />

          <p className="text-xs text-gray-400">
            Note: Images cannot be changed after posting.
          </p>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/my-donations')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
