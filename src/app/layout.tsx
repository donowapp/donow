/**
 * Root layout for Donow application
 * Navigation, footer, and global styles
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Donow - Free Donation Platform',
  description: 'Connect donors with people in need. Free donations for India.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <nav className="bg-teal-600 text-white p-4">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Donow</h1>
            <p className="text-sm text-teal-100">Donate. Help. Make Impact.</p>
          </div>
        </nav>
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