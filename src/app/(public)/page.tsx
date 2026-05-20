/**
 * Home page
 * Public landing page with CTA buttons
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="py-12 px-4">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Donate Now. Save Lives.
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Give away unused items to people in need. Zero burden. Maximum impact.
        </p>

        {user ? (
          <div className="space-x-4">
            <Link href="/create-donation">
              <Button size="lg">Donate an Item</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="secondary">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-x-4">
            <Link href="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Login
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="text-center">
          <div className="text-5xl mb-4">🎁</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple Listing</h3>
          <p className="text-gray-600">Post items you want to donate in minutes</p>
        </div>
        <div className="text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Directly</h3>
          <p className="text-gray-600">Chat with donors and coordinate pickups</p>
        </div>
        <div className="text-center">
          <div className="text-5xl mb-4">❤️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Make Impact</h3>
          <p className="text-gray-600">Help people in need and reduce waste</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto bg-teal-50 rounded-lg p-8 text-center mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-4xl font-bold text-teal-600">10,000+</p>
            <p className="text-gray-600">Items Donated</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-teal-600">5,000+</p>
            <p className="text-gray-600">Lives Helped</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-teal-600">1,000+</p>
            <p className="text-gray-600">Active Donors</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto text-center bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to make a difference?
        </h2>
        <p className="text-gray-600 mb-6">
          Join thousands of donors helping people across India
        </p>
        {!user && (
          <Link href="/signup">
            <Button size="lg">Sign Up Free</Button>
          </Link>
        )}
      </div>
    </div>
  );
}