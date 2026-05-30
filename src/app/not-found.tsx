import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-extrabold text-sky-600">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h2>
      <p className="mt-2 text-gray-500 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
        >
          Back to home
        </Link>
        <Link
          href="/donations"
          className="rounded-lg border border-sky-300 px-5 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 transition"
        >
          Browse donations
        </Link>
      </div>
    </div>
  );
}
