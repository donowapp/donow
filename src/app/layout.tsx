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
        <main className="container mx-auto py-8">{children}</main>
        <footer className="bg-gray-100 mt-10 px-4 py-8">
          <div className="mx-auto max-w-5xl flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-semibold text-gray-700">Donow &mdash; Donate. Help. Make Impact.</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <Link href="/terms" className="hover:text-teal-600 hover:underline">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-teal-600 hover:underline">Privacy Policy</Link>
              <Link href="/donations" className="hover:text-teal-600 hover:underline">Browse Donations</Link>
              <Link href="/create-donation" className="hover:text-teal-600 hover:underline">Donate an Item</Link>
            </div>
            <p className="text-xs text-gray-400">&copy; 2026 Donow. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
