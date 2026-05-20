import Link from 'next/link';
import { Button } from '@/components/common/Button';

export default function DonatePage() {
  return (
    <main className="bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-gray-900">Donate an Item</h1>
        <p className="mt-3 text-gray-600">
          Create a donation listing with images, pickup details, and item condition.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/create-donation">
            <Button>Create Donation</Button>
          </Link>
          <Link href="/donations">
            <Button variant="outline">Browse Donations</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
