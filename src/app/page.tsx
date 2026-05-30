'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { getFeaturedDonations } from '@/lib/donations';
import { getPlatformSettings } from '@/lib/admin';
import { getPublicStats, PublicStats } from '@/lib/stats';
import { CATEGORIES } from '@/constants/config';
import { Donation } from '@/types';

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1770908959158-aa1b885fa902?w=1600&q=85&fit=crop&crop=center';

function getCategoryName(id: Donation['category']) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';
}

export default function Home() {
  const [featured, setFeatured] = useState<Donation[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    getFeaturedDonations(8)
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));

    getPlatformSettings()
      .then((s) => { if (s.heroImageUrl) setHeroImage(s.heroImageUrl); })
      .catch(() => {});

    getPublicStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <main className="bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden text-white" style={{ minHeight: '560px' }}>
        {/* Full background image — happy blessed lady */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectPosition: '70% center' }}
        />
        {/* gradient overlay: strong teal on left so text is readable, fades to transparent on right so lady is visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-800/95 via-teal-700/80 to-teal-600/30" />
        {/* subtle bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-teal-900/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20">
          <div className="max-w-xl">
            <span className="mb-5 inline-block rounded-full bg-white/20 backdrop-blur-sm border border-white/20 px-4 py-1 text-xs font-bold uppercase tracking-widest">
              🇮🇳 Free · No middleman · Direct impact
            </span>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
              Donate unused items.<br />
              <span className="text-orange-300">Make someone smile today.</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 drop-shadow">
              Connect directly with people who need what you no longer use.<br className="hidden sm:block" />
              No fees, no barriers — just kindness.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/create-donation">
                <Button size="lg" className="bg-orange-400 hover:bg-orange-500 text-white border-0 shadow-lg">+ Create Donation</Button>
              </Link>
              <Link href="/donations">
                <Button size="lg" variant="outline" className="border-white/70 text-white hover:bg-white/10 backdrop-blur-sm">Browse Donations</Button>
              </Link>
            </div>
            {/* Stats */}
            <div className="mt-10 flex flex-wrap gap-3">
              {[
                { icon: '🎁', label: 'Items Donated',    val: '1,50,000+', sub: 'across India',  color: 'from-orange-400/30 to-orange-500/20', border: 'border-orange-300/30' },
                { icon: '😊', label: 'Happy Recipients', val: '1,00,000+', sub: 'lives touched', color: 'from-teal-400/30 to-teal-500/20',   border: 'border-teal-300/30'   },
                { icon: '📍', label: 'Cities Covered',   val: '500+',      sub: '28 states',     color: 'from-blue-400/30 to-blue-500/20',    border: 'border-blue-300/30'   },
              ].map((s) => (
                <div key={s.label} className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${s.color} backdrop-blur-sm border ${s.border} px-4 py-3 min-w-[140px]`}>
                  <span className="text-2xl flex-shrink-0">{s.icon}</span>
                  <div>
                    <p className="text-xl font-extrabold leading-none text-white">{s.val}</p>
                    <p className="text-xs font-semibold text-white/90 mt-0.5">{s.label}</p>
                    <p className="text-[10px] text-white/60">{s.sub}</p>
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
                img: 'https://plus.unsplash.com/premium_photo-1681483512987-93aadad48835?w=500&q=80&fit=crop',
                quote: 'I got a warm jacket just before winter. My children and I are so grateful. May God bless you!',
                name: 'Priya S.',
                city: 'Delhi',
                item: '🧥 Winter Jacket',
                emoji: '😊',
              },
              {
                img: 'https://plus.unsplash.com/premium_photo-1682089869602-2ec199cc501a?w=500&q=80&fit=crop',
                quote: 'The books helped my son prepare for his board exams. Thank you from the bottom of my heart.',
                name: 'Ramesh K.',
                city: 'Bangalore',
                item: '📚 Textbooks',
                emoji: '🥹',
              },
              {
                img: 'https://plus.unsplash.com/premium_photo-1682096037844-e43413e887a8?w=500&q=80&fit=crop',
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
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">❤️ Thank You Wall</h2>
          <p className="mb-8 text-center text-sm text-gray-400">Real messages from people across India 🇮🇳</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                photo: 'https://plus.unsplash.com/premium_photo-1681483517008-d54ca596ed94?w=120&q=80&fit=crop&crop=face',
                name: 'Anita R.', city: 'Jaipur',
                msg: 'Just received the baby clothes. Perfect timing! My newborn is so cozy now. 🙏',
                time: '2m ago', color: 'bg-pink-50 border-pink-200', reaction: '🥰',
              },
              {
                photo: 'https://plus.unsplash.com/premium_photo-1682089869602-2ec199cc501a?w=120&q=80&fit=crop&crop=face',
                name: 'Mohammed I.', city: 'Hyderabad',
                msg: 'The study table arrived in great condition. My daughter finally has a proper place to study!',
                time: '15m ago', color: 'bg-blue-50 border-blue-200', reaction: '😊',
              },
              {
                photo: 'https://plus.unsplash.com/premium_photo-1682096037844-e43413e887a8?w=120&q=80&fit=crop&crop=face',
                name: 'Kamla D.', city: 'Lucknow',
                msg: 'Thank you so much for the warm blankets. Winter was very difficult for us this year. 🙏❤️',
                time: '1h ago', color: 'bg-amber-50 border-amber-200', reaction: '🙏',
              },
              {
                photo: 'https://plus.unsplash.com/premium_photo-1726783564564-280eb0741ea3?w=120&q=80&fit=crop&crop=face',
                name: 'Sharma Family', city: 'Pune',
                msg: 'Got school bags and stationery for our kids. You made their first day of school special! 😭❤️',
                time: '3h ago', color: 'bg-green-50 border-green-200', reaction: '😭',
              },
              {
                photo: 'https://plus.unsplash.com/premium_photo-1682089892133-556bde898f2c?w=120&q=80&fit=crop&crop=face',
                name: 'Arjun P.', city: 'Chennai',
                msg: "Received the cricket bat and kit. I couldn't afford one on my own. Thank you so much!",
                time: '5h ago', color: 'bg-orange-50 border-orange-200', reaction: '🎉',
              },
              {
                photo: 'https://plus.unsplash.com/premium_photo-1681483512987-93aadad48835?w=120&q=80&fit=crop&crop=face',
                name: 'Meera T.', city: 'Kolkata',
                msg: 'The sewing machine changed my life. I can now stitch and earn for my family. Forever grateful 🙏',
                time: '1d ago', color: 'bg-purple-50 border-purple-200', reaction: '✨',
              },
            ].map((card, i) => (
              <div key={i} className={`flex items-start gap-4 rounded-2xl border-2 p-4 transition hover:shadow-lg hover:-translate-y-0.5 ${card.color}`}>
                {/* Photo thumbnail with flag badge */}
                <div className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.photo}
                    alt={card.name}
                    className="h-14 w-14 rounded-full object-cover shadow-md border-2 border-white"
                  />
                  {/* Indian flag badge */}
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow text-sm leading-none">
                    🇮🇳
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{card.name}</span>
                      <span className="text-base">{card.reaction}</span>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-gray-400 font-medium">{card.time}</span>
                  </div>
                  <span className="text-xs text-gray-400">📍 {card.city}</span>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{card.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="border-t bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Browse by Category</h2>
          <p className="mb-7 text-sm text-gray-500">Find what you need or donate what you have</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {CATEGORIES.map((cat) => {
              const img: Record<string, string> = {
                medical:   'https://plus.unsplash.com/premium_photo-1661767897334-bbfbdfdc4d1a?w=300&q=80&fit=crop',
                medicines: 'https://plus.unsplash.com/premium_photo-1673953509975-576678fa6710?w=300&q=80&fit=crop',
                clothes:   'https://plus.unsplash.com/premium_photo-1675186049366-64a655f8f537?w=300&q=80&fit=crop',
                books:     'https://plus.unsplash.com/premium_photo-1669652639337-c513cc42ead6?w=300&q=80&fit=crop',
                furniture: 'https://plus.unsplash.com/premium_photo-1670076513880-f58e3c377903?w=300&q=80&fit=crop',
                electronics:'https://plus.unsplash.com/premium_photo-1683120966127-14162cdd0935?w=300&q=80&fit=crop',
                toys:      'https://plus.unsplash.com/premium_photo-1684795780266-ecd819f04f96?w=300&q=80&fit=crop',
                food:      'https://plus.unsplash.com/premium_photo-1673108852141-e8c3c22a4a22?w=300&q=80&fit=crop',
                emergency: 'https://plus.unsplash.com/premium_photo-1687819872154-9d4fd3cb7cca?w=300&q=80&fit=crop',
                other:     'https://plus.unsplash.com/premium_photo-1683133263716-731795d25343?w=300&q=80&fit=crop',
              };
              return (
                <Link
                  key={cat.id}
                  href={`/donations?category=${cat.id}`}
                  className="group relative overflow-hidden rounded-2xl shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {/* Real photo background */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img[cat.id]}
                    alt={cat.name}
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  />
                  {/* gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* emoji badge top-right */}
                  <span className="absolute top-2 right-2 text-xl drop-shadow">{cat.icon}</span>
                  {/* label at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 pb-3 text-center">
                    <p className="text-xs font-bold text-white drop-shadow leading-tight">{cat.name}</p>
                  </div>
                </Link>
              );
            })}
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
