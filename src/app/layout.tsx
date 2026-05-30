import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Navbar from '@/components/common/Navbar';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#1A9E97',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Donow - Free Donation Platform',
  description: 'Connect donors with people in need. Free donations for India.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <Navbar />
        <main>{children}</main>
        <footer className="bg-gray-900 text-gray-300 px-4 pt-12 pb-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 mb-10">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xl font-extrabold text-white mb-1">Donow 🇮🇳</p>
                <p className="text-xs text-gray-400 mb-3">Donate. Help. Make Impact.</p>
                <p className="text-xs text-gray-500 leading-relaxed">India&apos;s free platform to connect donors with people who need help — no fees, no middlemen.</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Platform</p>
                <div className="space-y-2 text-sm">
                  <Link href="/donations" className="block hover:text-white transition">Browse Donations</Link>
                  <Link href="/create-donation" className="block hover:text-white transition">Donate an Item</Link>
                  <Link href="/saved" className="block hover:text-white transition">Saved Items</Link>
                  <Link href="/messages" className="block hover:text-white transition">Messages</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Categories</p>
                <div className="space-y-2 text-sm">
                  <Link href="/donations?category=clothes" className="block hover:text-white transition">Clothes</Link>
                  <Link href="/donations?category=books" className="block hover:text-white transition">Books</Link>
                  <Link href="/donations?category=medical" className="block hover:text-white transition">Medical</Link>
                  <Link href="/donations?category=food" className="block hover:text-white transition">Food</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Company</p>
                <div className="space-y-2 text-sm">
                  <Link href="/terms" className="block hover:text-white transition">Terms of Service</Link>
                  <Link href="/privacy" className="block hover:text-white transition">Privacy Policy</Link>
                  <a href="mailto:help.donow@gmail.com" className="block hover:text-white transition">Contact Us</a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
              <p>&copy; 2026 Donow. All rights reserved. Made with ❤️ for India.</p>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-green-900/50 border border-green-700/40 px-2.5 py-1 text-green-400 font-semibold">✓ 100% Free</span>
                <span className="rounded-full bg-blue-900/50 border border-blue-700/40 px-2.5 py-1 text-blue-400 font-semibold">🔒 Secure</span>
                <span className="rounded-full bg-orange-900/50 border border-orange-700/40 px-2.5 py-1 text-orange-400 font-semibold">🇮🇳 Made in India</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
