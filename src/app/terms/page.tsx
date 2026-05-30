import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Donow',
};

export default function TermsPage() {
  return (
    <div className="bg-gray-50 min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mb-8 text-sm text-gray-500">Last updated: May 2025</p>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            By accessing or using Donow (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the Platform. Donow is a free donation
            coordination platform connecting donors with recipients across India.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">2. Eligibility</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            You must be at least 18 years old to create an account. By registering, you confirm that
            the information you provide is accurate and that you have the legal capacity to enter
            into these Terms.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">3. Donations and Listings</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-600">
            <li>All donations listed on Donow must be legal, safe, and accurately described.</li>
            <li>Donors are responsible for the condition and safety of items they list.</li>
            <li>Donow does not handle, store, or ship any physical items.</li>
            <li>Monetary transactions are not facilitated through this Platform.</li>
            <li>Donow reserves the right to remove listings that violate these Terms or applicable law.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">4. User Conduct</h2>
          <p className="mb-2 text-sm leading-relaxed text-gray-600">You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-600">
            <li>Post false, misleading, or fraudulent listings.</li>
            <li>Harass, threaten, or abuse other users through the messaging system.</li>
            <li>Use the Platform for commercial gain or advertising purposes.</li>
            <li>Attempt to gain unauthorised access to other accounts or systems.</li>
            <li>Post illegal, offensive, or harmful content.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">5. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Content you upload (photos, descriptions) remains yours. By posting, you grant Donow a
            non-exclusive, royalty-free licence to display that content on the Platform. Donow&rsquo;s
            branding, code, and UI are owned by Donow and may not be copied without permission.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">6. Disclaimers</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Donow is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee the
            quality, safety, or legality of any listed item. All arrangements between donors and
            recipients are entirely their own responsibility. Donow is not liable for any loss or
            damage arising from use of the Platform or transactions between users.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">7. Account Suspension</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Donow reserves the right to suspend or permanently ban accounts that violate these Terms,
            engage in fraudulent activity, or harm the community, without prior notice.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">8. Changes to Terms</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            We may update these Terms from time to time. Continued use of the Platform after changes
            are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-bold text-gray-800">9. Governing Law</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            These Terms are governed by the laws of India. Any disputes will be subject to the
            exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <p className="text-xs text-gray-400">
          Questions? Contact us at{' '}
          <a href="mailto:support@donow.in" className="text-violet-600 hover:underline">
            support@donow.in
          </a>
        </p>

        <div className="mt-6 border-t pt-4 flex gap-4 text-sm">
          <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
          <Link href="/" className="text-gray-500 hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
