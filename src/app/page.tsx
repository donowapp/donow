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
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    getFeaturedDonations(8)
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <main className="bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-teal-700 px-4 py-16 text-white">
        {/* background circles decoration */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-bold uppercase tracking-widest">Free · No middleman · Direct impact</span>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
              Donate unused items.<br />
              <span className="text-orange-300">Make someone smile today.</span>
            </h1>
            <p className="mt-4 text-lg text-teal-100">
              Connect directly with people who need what you no longer use. No fees, no barriers — just kindness.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/create-donation">
                <Button size="lg" className="bg-orange-400 hover:bg-orange-500 text-white border-0">+ Create Donation</Button>
              </Link>
              <Link href="/donations">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Browse Donations</Button>
              </Link>
            </div>
            {/* mini stats */}
            <div className="mt-10 flex flex-wrap gap-6">
              {[['🎁', 'Items Donated', '500+'], ['😊', 'Happy Recipients', '300+'], ['🌆', 'Cities', '50+']].map(([icon, label, val]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-lg font-extrabold leading-none">{val}</p>
                    <p className="text-xs text-teal-200">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Donations Carousel */}
      {(loadingFeatured || featured.length > 0) && (
        <section className="border-t bg-white px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Featured Donations</h2>
              <Link href="/donations" className="text-sm font-semibold text-orange-400 hover:text-orange-500">
                View all →
              </Link>
            </div>
            {loadingFeatured ? (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-56 rounded-lg border bg-gray-50 overflow-hidden animate-pulse">
                    <div className="h-36 bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-16 rounded bg-gray-200" />
                      <div className="h-4 w-full rounded bg-gray-200" />
                      <div className="h-3 w-20 rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        </section>
      )}

      {/* Stories of Impact */}
      <section className="border-t bg-gradient-to-br from-teal-50 via-white to-orange-50 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-orange-500">Real Stories</span>
          </div>
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">People Whose Lives You Touched</h2>
          <p className="mb-10 text-center text-sm text-gray-500">Every donation creates a real smile. Here are a few.</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=80&fit=crop',
                quote: 'I got a warm jacket just before winter. My children and I are so grateful. May God bless you!',
                name: 'Priya S.',
                city: 'Delhi',
                item: '🧥 Winter Jacket',
                emoji: '😊',
              },
              {
                img: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=500&q=80&fit=crop',
                quote: 'The books helped my son prepare for his board exams. Thank you from the bottom of my heart.',
                name: 'Ramesh K.',
                city: 'Bangalore',
                item: '📚 Textbooks',
                emoji: '🥹',
              },
              {
                img: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=500&q=80&fit=crop',
                quote: 'We received a wheelchair for my mother. Words cannot describe how much this means to us.',
                name: 'Sunita M.',
                city: 'Mumbai',
                item: '♿ Wheelchair',
                emoji: '❤️',
              },
            ].map((story, i) => (
              <div key={i} className="group flex flex-col rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl overflow-hidden">
                <div className="relative h-52 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.img} alt={story.name} className="h-full w-full object-cover object-top transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute bottom-3 right-3 text-3xl drop-shadow">{story.emoji}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="mb-4 flex-1 text-sm italic leading-relaxed text-gray-600">&ldquo;{story.quote}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{story.name}</p>
                      <p className="text-xs text-gray-400">{story.city}</p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{story.item}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Thank You Wall */}
      <section className="border-t bg-white px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-teal-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-teal-600">Gratitude</span>
          </div>
          <h2 className="mb-8 text-center text-3xl font-extrabold text-gray-900">❤️ Thank You Wall</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { avatar: '👩', name: 'Anita R.', city: 'Jaipur', msg: 'Just received the baby clothes. Perfect timing! My newborn is so cozy now. 🙏', time: '2m ago', color: 'bg-pink-50 border-pink-100' },
              { avatar: '👨', name: 'Mohammed I.', city: 'Hyderabad', msg: 'The study table arrived in great condition. My daughter finally has a proper place to study!', time: '15m ago', color: 'bg-blue-50 border-blue-100' },
              { avatar: '👵', name: 'Kamla D.', city: 'Lucknow', msg: 'Thank you so much for the warm blankets. Winter was very difficult for us this year. 🙏❤️', time: '1h ago', color: 'bg-amber-50 border-amber-100' },
              { avatar: '👨‍👩‍👧', name: 'Sharma Family', city: 'Pune', msg: 'Got school bags and stationery for our kids. You made their first day of school special! 😭❤️', time: '3h ago', color: 'bg-green-50 border-green-100' },
              { avatar: '👦', name: 'Arjun P.', city: 'Chennai', msg: 'Received the cricket bat and kit. I couldn\'t afford one on my own. Thank you so much!', time: '5h ago', color: 'bg-orange-50 border-orange-100' },
              { avatar: '👩‍🦳', name: 'Meera T.', city: 'Kolkata', msg: 'The sewing machine changed my life. I can now stitch and earn for my family. Forever grateful 🙏', time: '1d ago', color: 'bg-purple-50 border-purple-100' },
            ].map((card, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 transition hover:shadow-md ${card.color}`}>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">{card.avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900">{card.name}</span>
                    <span className="whitespace-nowrap text-xs text-gray-400">{card.time}</span>
                  </div>
                  <span className="text-xs text-gray-400">{card.city}</span>
                  <p className="mt-1 text-sm text-gray-700">{card.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
