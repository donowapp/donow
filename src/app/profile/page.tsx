'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { syncOwnPublicProfile } from '@/lib/profiles';
import { signedUpload } from '@/lib/cloudinary';
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        pincode: user.pincode ?? '',
        bio: (user as { bio?: string }).bio ?? '',
      });
    }
  }, [user]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB.');
      e.target.value = '';
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      let profileImage = user.profileImage;
      if (photoFile) {
        profileImage = await signedUpload(photoFile, 'donow/avatars');
      }
      await updateDoc(doc(db, 'users', user.uid), {
        ...form,
        ...(profileImage ? { profileImage } : {}),
        updatedAt: new Date(),
      });
      // Mirror display fields to the public profile.
      await syncOwnPublicProfile(user.uid, {
        name: form.name,
        city: form.city,
        state: form.state,
        profileImage,
      });
      await checkAuth();
      setSaved(true);
      setPhotoFile(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile. Please try again.');
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

  const avatarSrc = photoPreview || user.profileImage;
  const initials = (user.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-1 text-gray-500">Update your personal information</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
          )}
          {saved && (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">
              Profile saved successfully.
            </div>
          )}

          {/* Avatar */}
          <div className="flex flex-col items-center pb-2">
            <div className="relative">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-teal-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center text-3xl font-bold text-teal-600">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 bg-teal-600 text-white rounded-full p-1.5 hover:bg-teal-700 transition shadow"
                aria-label="Change photo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">Tap camera icon to change photo</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <Input label="Full Name" value={form.name} onChange={set('name')} required />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
          <Input label="Address" value={form.address} onChange={set('address')} placeholder="Street, area, landmark" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="City" value={form.city} onChange={set('city')} />
            <Input label="State" value={form.state} onChange={set('state')} />
            <Input label="Pincode" value={form.pincode} onChange={set('pincode')} />
          </div>

          <div>
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
