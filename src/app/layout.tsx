import type { Metadata } from 'next';
import Navbar from '@/components/common/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Donow - Free Donation Platform',
  description: 'Connect donors with people in need. Free donations for India.',
  icons: { icon: '/icon', apple: '/apple-icon' },
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
        <footer className="bg-gray-100 text-center p-6 mt-10">
          <p className="text-gray-600">
            &copy; 2024 Donow. Free Donation Platform. All rights reserved.
          </p>
        </footer>
      </body>
    </html>
  );
}
