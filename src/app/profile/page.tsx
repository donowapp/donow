'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bio: '',
  });

  useEffect(() => {
    let isMounted = true;
    checkAuth().finally(() => { if (isMounted) setCheckingAuth(false); });
    return () => { isMounted = false; };
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth && !loading && !user) router.push('/login');
  }, [checkingAuth, loading, router, user]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        pincode: user.pincode ?? '',
        bio: user.bio ?? '',
      });
    }
  }, [user]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...form,
        updatedAt: new Date(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
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
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-1 text-gray-500">Update your personal information</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow space-y-1">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
              Profile saved successfully.
            </div>
          )}

          <Input label="Full Name" value={form.name} onChange={set('name')} required />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
          <Input label="Address" value={form.address} onChange={set('address')} placeholder="Street, area, landmark" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="City" value={form.city} onChange={set('city')} />
            <Input label="State" value={form.state} onChange={set('state')} />
            <Input label="Pincode" value={form.pincode} onChange={set('pincode')} />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Bio</label>
            <textarea
              value={form.bio}
              onChange={set('bio')}
              rows={3}
              placeholder="A short bio about yourself (optional)"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
