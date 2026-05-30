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

const CATEGORY_IMAGES: Record<string, string> = {
  medical:    'https://images.unsplash.com/photo-1642680936843-b09109c69104?w=300&q=80&fit=crop',
  medicines:  'https://images.unsplash.com/photo-1573883430697-4c3479aae6b9?w=300&q=80&fit=crop',
  clothes:    'https://plus.unsplash.com/premium_photo-1661741379133-9206bca144dc?w=300&q=80&fit=crop',
  books:      'https://images.unsplash.com/photo-1603058817990-2b9a9abbce86?w=300&q=80&fit=crop',
  furniture:  'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=300&q=80&fit=crop',
  electronics:'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=300&q=80&fit=crop',
  toys:       'https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=300&q=80&fit=crop',
  food:       'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=300&q=80&fit=crop',
  emergency:  'https://images.unsplash.com/photo-1619025873875-59dfdd2bbbd6?w=300&q=80&fit=crop',
  other:      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&q=80&fit=crop',
};

export default function Home() {
  const [featured, setFeatured] = useState<Donation[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    getFeaturedDonations(8).then(setFeatured).catch(() => {}).finally(() => setLoadingFeatured(false));
    getPlatformSettings().then((s) => { if (s.heroImageUrl) setHeroImage(s.heroImageUrl); }).catch(() => {});
    getPublicStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="bg-gray-50">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white" style={{ minHeight: '580px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '70% center' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-teal-900/95 via-teal-800/85 to-teal-600/20" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-teal-900/50 to-transparent" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 sm:py-24">
          <div className="max-w-xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
              ✦ Free · No middleman · Direct impact
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
              Donate unused items.<br />
              <span className="text-orange-300">Make someone smile today.</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 leading-relaxed">
              Connect directly with people who need what you no longer use. No fees, no barriers — just kindness.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create-donation">
                <Button size="lg" className="bg-orange-400 hover:bg-orange-500 text-white border-0 shadow-xl px-8">🎁 Donate Now</Button>
              </Link>
              <Link href="/donations">
                <Button size="lg" variant="outline" className="border-white/70 text-white hover:bg-white/10 backdrop-blur-sm">Browse Donations</Button>
              </Link>
            </div>
            {/* Live stats */}
            <div className="mt-10 flex flex-wrap gap-3">
              {[
                { icon: '🎁', label: 'Items Donated',    val: '1,50,000+', sub: 'across India',  color: 'from-orange-400/25 to-orange-500/15', border: 'border-orange-300/30' },
                { icon: '😊', label: 'Happy Recipients', val: '1,00,000+', sub: 'lives touched', color: 'from-teal-400/25 to-teal-500/15',     border: 'border-teal-300/30'   },
                { icon: '📍', label: 'Cities Covered',   val: '500+',      sub: '28 states',     color: 'from-blue-400/25 to-blue-500/15',     border: 'border-blue-300/30'   },
              ].map((s) => (
                <div key={s.label} className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${s.color} backdrop-blur-sm border ${s.border} px-4 py-3`}>
                  <span className="text-2xl">{s.icon}</span>
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

      {/* ── TRUST BAR ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-gray-500">
          {[
            ['✅', 'Verified Users'],
            ['🔒', '100% Secure'],
            ['🚫', 'Zero Commission'],
            ['📱', 'Available on App'],
            ['🍀', 'Made in India'],
            ['⚡', 'Instant Connect'],
          ].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1.5">{icon} {label}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURED DONATIONS ───────────────────────────────────────────────── */}
      {(loadingFeatured || featured.length > 0) && (
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">⭐ Featured Donations</h2>
                <p className="text-sm text-gray-400 mt-0.5">Hand-picked items available near you</p>
              </div>
              <Link href="/donations" className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-500 hover:bg-orange-100 transition">
                View all →
              </Link>
            </div>
            {loadingFeatured ? (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-60 rounded-2xl border bg-gray-50 overflow-hidden animate-pulse">
                    <div className="h-40 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 w-16 rounded bg-gray-200" />
                      <div className="h-4 w-full rounded bg-gray-200" />
                      <div className="h-3 w-20 rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollSnapType: 'x mandatory' }}>
                {featured.map((donation) => (
                  <Link
                    key={donation.id}
                    href={`/donations/${donation.id}`}
                    className="group flex-shrink-0 w-60 rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl transition hover:-translate-y-1"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="h-40 bg-gray-200 bg-cover bg-center relative overflow-hidden"
                      style={{ backgroundImage: donation.images[0] ? `url(${donation.images[0]})` : undefined }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="p-4">
                      <span className="rounded-full bg-teal-50 border border-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                        {getCategoryName(donation.category)}
                      </span>
                      <h3 className="mt-2 line-clamp-2 text-sm font-bold text-gray-900">{donation.title}</h3>
                      <p className="mt-1 text-xs text-gray-400">📍 {donation.location.city}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── BROWSE BY CATEGORY ────────────────────────────────────────────────── */}
      <section className="border-t bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2">
            <h2 className="text-2xl font-extrabold text-gray-900">Browse by Category</h2>
            <p className="mt-1 text-sm text-gray-500">Find what you need or donate what you have</p>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/donations?category=${cat.id}`}
                className="group relative overflow-hidden rounded-2xl shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                style={{ aspectRatio: '1 / 1' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CATEGORY_IMAGES[cat.id]} alt={cat.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="absolute top-2 right-2 text-xl drop-shadow">{cat.icon}</span>
                <div className="absolute bottom-0 left-0 right-0 px-2 pb-3 text-center">
                  <p className="text-xs font-bold text-white drop-shadow leading-tight">{cat.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="border-t bg-white px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-teal-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-teal-600">Simple Process</span>
          </div>
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">How Donow Works</h2>
          <p className="mb-12 text-center text-sm text-gray-400">3 simple steps to give or receive</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 relative">
            {/* connector line desktop */}
            <div className="hidden sm:block absolute top-10 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-teal-200 via-orange-200 to-teal-200" />
            {[
              { step: '01', icon: '📸', color: 'bg-teal-500', light: 'bg-teal-50 border-teal-100', title: 'Post an Item', desc: 'Take a photo, choose category, write a short description and your pickup city. Takes just 2 minutes.' },
              { step: '02', icon: '🔍', color: 'bg-orange-400', light: 'bg-orange-50 border-orange-100', title: 'Find & Request', desc: 'Browse items near you by category. Click "I Need This" to send a request to the donor directly.' },
              { step: '03', icon: '🤝', color: 'bg-green-500', light: 'bg-green-50 border-green-100', title: 'Connect & Pickup', desc: 'Chat with the donor, agree on a time and location. Pick up the item for free — no money involved.' },
            ].map((step) => (
              <div key={step.step} className={`relative rounded-2xl border-2 ${step.light} p-6 text-center`}>
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${step.color} shadow-lg`}>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <span className={`absolute top-4 right-4 text-xs font-black ${step.color.replace('bg-', 'text-')} opacity-40`}>{step.step}</span>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY DONOW ────────────────────────────────────────────────────────── */}
      <section className="border-t bg-gradient-to-br from-teal-50 to-orange-50 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-orange-500">Why Choose Us</span>
          </div>
          <h2 className="mb-10 text-center text-3xl font-extrabold text-gray-900">Why Donow?</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: '🆓', title: 'Completely Free', desc: 'No fees, no subscriptions, no hidden charges. Always free for donors and recipients.', color: 'border-teal-200 bg-white' },
              { icon: '🚫', title: 'No Middleman', desc: 'Connect directly with each other. No NGO cut, no commission — 100% goes from donor to recipient.', color: 'border-orange-200 bg-white' },
              { icon: '⚡', title: 'Instant Connect', desc: 'Real-time messaging lets you coordinate pickup within minutes of finding an item.', color: 'border-blue-200 bg-white' },
              { icon: '🔒', title: 'Safe & Verified', desc: 'User profiles with ratings and reviews. Donate and receive with confidence.', color: 'border-green-200 bg-white' },
            ].map((w) => (
              <div key={w.title} className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 ${w.color}`}>
                <span className="text-4xl mb-3 block">{w.icon}</span>
                <h3 className="font-extrabold text-gray-900 mb-1">{w.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORIES OF IMPACT ────────────────────────────────────────────────── */}
      <section className="border-t bg-white px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-orange-500">Real Stories</span>
          </div>
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">People Whose Lives You Touched</h2>
          <p className="mb-10 text-center text-sm text-gray-500">Every donation creates a real smile. Here are a few.</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { img: 'https://images.unsplash.com/photo-1770908959158-aa1b885fa902?w=500&q=80&fit=crop&crop=top', quote: 'I got a warm jacket just before winter. My children and I are so grateful. May God bless you!', name: 'Priya S.', city: 'Delhi', item: '🧥 Winter Jacket', emoji: '😊' },
              { img: 'https://plus.unsplash.com/premium_photo-1682089869602-2ec199cc501a?w=500&q=80&fit=crop&crop=top', quote: 'The books helped my son prepare for his board exams. Thank you from the bottom of my heart.', name: 'Ramesh K.', city: 'Bangalore', item: '📚 Textbooks', emoji: '🥹' },
              { img: 'https://images.unsplash.com/photo-1489993360877-883980cc7333?w=500&q=80&fit=crop&crop=top', quote: 'We received a wheelchair for my mother. Words cannot describe how much this means to us.', name: 'Sunita M.', city: 'Mumbai', item: '♿ Wheelchair', emoji: '❤️' },
            ].map((story, i) => (
              <div key={i} className="group flex flex-col rounded-2xl bg-white border border-gray-100 shadow-md transition hover:-translate-y-1 hover:shadow-xl overflow-hidden">
                <div className="relative h-52 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.img} alt={story.name} className="h-full w-full object-cover object-top transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-3 right-3 text-3xl drop-shadow">{story.emoji}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="mb-4 flex-1 text-sm italic leading-relaxed text-gray-600">&ldquo;{story.quote}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{story.name}</p>
                      <p className="text-xs text-gray-400">📍 {story.city}</p>
                    </div>
                    <span className="rounded-full bg-teal-50 border border-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">{story.item}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THANK YOU WALL ───────────────────────────────────────────────────── */}
      <section className="border-t bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 text-center">
            <span className="inline-block rounded-full bg-teal-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-teal-600">Gratitude</span>
          </div>
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">❤️ Thank You Wall</h2>
          <p className="mb-8 text-center text-sm text-gray-400">Real messages from people across India</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { photo: 'https://plus.unsplash.com/premium_photo-1661594909295-1ba7e9078696?w=120&q=80&fit=crop&crop=face', name: 'Anita R.', city: 'Jaipur', msg: 'Just received the baby clothes. Perfect timing! My newborn is so cozy now. 🙏', time: '2m ago', color: 'bg-pink-50 border-pink-200', reaction: '🥰' },
              { photo: 'https://images.unsplash.com/photo-1744804298701-f7be33867ca3?w=120&q=80&fit=crop&crop=face', name: 'Mohammed I.', city: 'Hyderabad', msg: 'The study table arrived in great condition. My daughter finally has a proper place to study!', time: '15m ago', color: 'bg-blue-50 border-blue-200', reaction: '😊' },
              { photo: 'https://images.unsplash.com/photo-1749793299204-462f634e53cc?w=120&q=80&fit=crop&crop=face', name: 'Kamla D.', city: 'Lucknow', msg: 'Thank you so much for the warm blankets. Winter was very difficult for us this year. 🙏❤️', time: '1h ago', color: 'bg-amber-50 border-amber-200', reaction: '🙏' },
              { photo: 'https://images.unsplash.com/photo-1558023598-0afa967eac90?w=120&q=80&fit=crop&crop=face', name: 'Sharma Family', city: 'Pune', msg: 'Got school bags and stationery for our kids. You made their first day of school special! 😭❤️', time: '3h ago', color: 'bg-green-50 border-green-200', reaction: '😭' },
              { photo: 'https://plus.unsplash.com/premium_photo-1661631235126-d692141653c7?w=120&q=80&fit=crop&crop=face', name: 'Arjun P.', city: 'Chennai', msg: "Received the cricket bat and kit. I couldn't afford one on my own. Thank you so much!", time: '5h ago', color: 'bg-orange-50 border-orange-200', reaction: '🎉' },
              { photo: 'https://plus.unsplash.com/premium_photo-1682092082088-28369c9ec0d0?w=120&q=80&fit=crop&crop=face', name: 'Meera T.', city: 'Kolkata', msg: 'The sewing machine changed my life. I can now stitch and earn for my family. Forever grateful 🙏', time: '1d ago', color: 'bg-purple-50 border-purple-200', reaction: '✨' },
            ].map((card, i) => (
              <div key={i} className={`flex items-start gap-4 rounded-2xl border-2 p-4 transition hover:shadow-lg hover:-translate-y-0.5 ${card.color}`}>
                <div className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.photo} alt={card.name} className="h-14 w-14 rounded-full object-cover shadow-md border-2 border-white" />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 shadow border-2 border-white">
                    <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{card.name}</span>
                      <span className="text-base">{card.reaction}</span>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-gray-400 font-medium">{card.time}</span>
                  </div>
                  <span className="text-xs text-gray-400">📍 {card.city}</span>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{card.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP DOWNLOAD / CTA BANNER ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-teal-800 px-4 py-14 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative z-10 mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest mb-3">Join the Movement</span>
            <h2 className="text-3xl font-extrabold mb-2">Ready to make a difference?</h2>
            <p className="text-teal-100 text-base max-w-md">Thousands of Indians are already giving and receiving. Your unused item could change someone&apos;s life today.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/create-donation">
                <button className="rounded-xl bg-orange-400 hover:bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition">🎁 Donate an Item</button>
              </Link>
              <Link href="/donations">
                <button className="rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 px-6 py-3 text-sm font-bold text-white transition">🔍 Find Donations</button>
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0 text-center">
            <p className="text-sm text-teal-200 mb-3 font-semibold">Also available on mobile</p>
            <div className="flex gap-3 justify-center">
              <div className="rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-center hover:bg-white/20 transition cursor-pointer">
                <p className="text-2xl mb-1">🤖</p>
                <p className="text-xs font-bold">Android App</p>
                <p className="text-[10px] text-teal-200">Download APK</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-center hover:bg-white/20 transition cursor-pointer">
                <p className="text-2xl mb-1">🍎</p>
                <p className="text-xs font-bold">iOS App</p>
                <p className="text-[10px] text-teal-200">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
