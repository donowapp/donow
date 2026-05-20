import DonationDetailsClient from './DonationDetailsClient';

export default async function DonationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DonationDetailsClient donationId={id} />;
}
