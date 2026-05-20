import Link from 'next/link';
import { Button } from '@/components/common/Button';

export default function Home() {
  return (
    <main className="bg-gray-50">
      <section className="px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold text-gray-900">Donow</h1>
            <p className="mt-4 text-xl text-gray-700">
              Donate unused items to people who can use them today.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/create-donation">
                <Button size="lg">Create Donation</Button>
              </Link>
              <Link href="/donations">
                <Button size="lg" variant="outline">
                  Browse Donations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              Open a donation, review donor details, and contact them directly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
