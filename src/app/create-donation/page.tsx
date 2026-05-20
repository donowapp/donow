'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { CATEGORIES, CONDITIONS } from '@/constants/config';
import { createDonation } from '@/lib/donations';
import { useAuth } from '@/hooks/useAuth';
import { Donation } from '@/types';

const MAX_IMAGES = 5;

export default function CreateDonationPage() {
  const router = useRouter();
  const { user, loading, checkAuth } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as Donation['category'],
    condition: 'good' as Donation['condition'],
    address: '',
    city: '',
  });

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
    if (!checkingAuth && !user) {
      router.push('/login');
    }
  }, [checkingAuth, router, user]);

  const imagePreviews = useMemo(
    () =>
      images.map((image) => ({
        name: image.name,
        url: URL.createObjectURL(image),
      })),
    [images]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.address.trim()) errors.address = 'Pickup address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (images.length === 0) errors.images = 'Add at least one image';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImages = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, MAX_IMAGES);

    setImages(selectedImages);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError('Please login before creating a donation.');
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const donation = await createDonation({
        userId: user.uid,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        address: formData.address,
        city: formData.city,
        images,
      });

      router.push(`/donations/${donation.id}`);
    } catch (submitError) {
      console.error('Create donation error:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not create donation. Please try again.'
      );
      setSubmitting(false);
    }
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Donation</h1>
          <p className="mt-2 text-gray-600">
            Add clear details so people nearby can understand what you are offering.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <Input
            label="Title"
            value={formData.title}
            onChange={(event) =>
              setFormData({ ...formData, title: event.target.value })
            }
            placeholder="Wooden study table"
            error={validationErrors.title}
            required
          />

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Description<span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              placeholder="Share item size, condition, pickup timing, and anything the receiver should know."
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-500">
                {validationErrors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    category: event.target.value as Donation['category'],
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    condition: event.target.value as Donation['condition'],
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 capitalize outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Pickup Address"
            value={formData.address}
            onChange={(event) =>
              setFormData({ ...formData, address: event.target.value })
            }
            placeholder="Street, area, landmark"
            error={validationErrors.address}
            required
          />

          <Input
            label="City"
            value={formData.city}
            onChange={(event) =>
              setFormData({ ...formData, city: event.target.value })
            }
            placeholder="Mumbai"
            error={validationErrors.city}
            required
          />

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Images<span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition file:mr-4 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 focus:border-transparent focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Upload up to {MAX_IMAGES} images.
            </p>
            {validationErrors.images && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.images}</p>
            )}

            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagePreviews.map((preview) => (
                  <div key={preview.url} className="overflow-hidden rounded border">
                    <div
                      className="h-32 w-full bg-gray-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${preview.url})` }}
                      aria-label={preview.name}
                      role="img"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creating donation...' : 'Create Donation'}
          </Button>
        </form>
      </div>
    </div>
  );
}
