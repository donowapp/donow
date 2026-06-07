'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { StarRating } from '@/components/common/StarRating';
import { SafetyNotice } from '@/components/common/SafetyNotice';
import { CATEGORIES } from '@/constants/config';
import { getDonationById, getDonorById, getDonationAddress, toggleInterest, toggleSavedDonation } from '@/lib/donations';
import { getOrCreateConversation, buildConversationId, getConversation } from '@/lib/messages';
import { getDonationReviews, hasUserReviewed, addReview, getDonorAverageRating } from '@/lib/reviews';
import { createNotification } from '@/lib/notifications';
import { cld } from '@/lib/cld';
import { track } from '@/lib/analytics';
import { captureError } from '@/lib/crash';
import { ReportDialog } from '@/components/common/ReportDialog';
import { useAuth } from '@/hooks/useAuth';
import { Donation, User, Review } from '@/types';

type DonorProfile = Pick<User, 'uid' | 'name' | 'city' | 'state' | 'profileImage' | 'donationCount' | 'receivedCount' | 'rating' | 'isVerified'>;

interface DonationDetailsClientProps {
  donationId: string;
}

function getCategoryName(categoryId: Donation['category']) {
  return CATEGORIES.find((c) => c.id === categoryId)?.name ?? 'Other';
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function DonationDetailsClient({ donationId }: DonationDetailsClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [privateAddress, setPrivateAddress] = useState<string | null>(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startingChat, setStartingChat] = useState(false);
  const [togglingInterest, setTogglingInterest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [donorRating, setDonorRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getDonationById(donationId)
      .then(async (loadedDonation) => {
        if (!isMounted) return;
        if (!loadedDonation) { setError('Donation not found.'); return; }

        setDonation(loadedDonation);
        setSelectedImage(loadedDonation.images[0] ?? '');
        track('donation_viewed', { donationId, category: loadedDonation.category });

        const isViewerOwner = !!user && user.uid === loadedDonation.userId;
        const [loadedDonor, donationReviews, ratingData, address, convExists] = await Promise.all([
          getDonorById(loadedDonation.userId),
          getDonationReviews(donationId),
          getDonorAverageRating(loadedDonation.userId),
          getDonationAddress(donationId), // null unless owner / has a conversation
          user && !isViewerOwner
            ? getConversation(buildConversationId(donationId, loadedDonation.userId, user.uid))
                .then((c) => !!c)
                .catch(() => false)
            : Promise.resolve(false),
        ]);

        if (isMounted) {
          setDonor(loadedDonor);
          setReviews(donationReviews);
          setDonorRating(ratingData);
          setPrivateAddress(address);
          setHasConversation(convExists);
          if (address && !isViewerOwner) track('address_revealed', { donationId });
        }
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : 'Could not load donation details.');
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [donationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user && donation) setIsSaved(user.savedDonations?.includes(donation.id) ?? false);
  }, [user, donation]);

  useEffect(() => {
    if (!user || !donation) return;
    hasUserReviewed(donationId, user.uid).then(setHasReviewed).catch(() => {});
  }, [user, donationId, donation]);

  const handleToggleInterest = async () => {
    if (!user || !donation) return;
    const isInterested = donation.interestedUsers.includes(user.uid);
    setTogglingInterest(true);
    try {
      await toggleInterest(donation.id, user.uid, !isInterested);
      if (!isInterested) {
        track('interest_expressed', { donationId: donation.id });
        createNotification({
          userId: donation.userId,
          type: 'interest',
          title: `${user.name} is interested in your donation`,
          body: donation.title,
          donationId: donation.id,
        }).catch(() => {});
      }
      setDonation((prev) =>
        prev
          ? {
              ...prev,
              interestedUsers: isInterested
                ? prev.interestedUsers.filter((id) => id !== user.uid)
                : [...prev.interestedUsers, user.uid],
            }
          : prev
      );
    } catch (e) {
      // Non-critical: don't blank the page (setError renders a full-page error).
      // Log for observability; the optimistic state simply isn't applied.
      captureError(e, { action: 'toggleInterest', donationId: donation.id });
    } finally {
      setTogglingInterest(false);
    }
  };

  const handleMessageDonor = async () => {
    if (!user || !donation || !donor) return;
    setStartingChat(true);
    try {
      const convId = await getOrCreateConversation(
        donation.id, donation.userId, user.uid,
        donor.name || 'Donor', user.name || 'User', donation.title
      );
      track('chat_started', { donationId: donation.id });
      router.push(`/messages/${convId}`);
    } catch (e) {
      captureError(e, { action: 'messageDonor', donationId: donation.id });
      setStartingChat(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !donation) return;
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    setSavingState(true);
    try {
      await toggleSavedDonation(user.uid, donation.id, newSaved);
    } catch {
      setIsSaved(!newSaved);
    } finally {
      setSavingState(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !donation) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await addReview({
        donationId: donation.id,
        reviewerId: user.uid,
        reviewerName: user.name,
        revieweeId: donation.userId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      track('review_submitted', { donationId: donation.id, rating: reviewRating });
      createNotification({
        userId: donation.userId,
        type: 'review',
        title: `${user.name} left you a review`,
        body: reviewComment.trim() || `${reviewRating} stars`,
        donationId: donation.id,
      }).catch(() => {});
      const newReview: Review = {
        id: Date.now().toString(),
        donationId: donation.id,
        reviewerId: user.uid,
        reviewerName: user.name,
        revieweeId: donation.userId,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date(),
      };
      setReviews((prev) => [newReview, ...prev]);
      setHasReviewed(true);
      setReviewComment('');
    } catch {
      setReviewError('Could not submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-600">Loading donation...</p>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="min-h-[60vh] bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-gray-900">{error ?? 'Donation not found.'}</h1>
          <Link href="/donations" className="mt-4 inline-block">
            <Button>Browse Donations</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.uid === donation.userId;
  const isInterested = user ? donation.interestedUsers.includes(user.uid) : false;
  // A review requires a real transaction (matches firestore.rules): the donation
  // must be completed AND the reviewer must have a conversation with the donor.
  const isCompleted = donation.status === 'completed';
  const canReview = !!user && !isOwner && !hasReviewed && isCompleted && hasConversation;
  // Explain why the form is hidden, so non-owners aren't left at a dead-end.
  const reviewHint =
    user && !isOwner && !hasReviewed
      ? !isCompleted
        ? 'You can leave a review once the donor marks this donation as completed.'
        : !hasConversation
          ? 'Only people who connected with the donor about this item can leave a review.'
          : null
      : null;

  return (
    <div className="bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/donations" className="text-sm font-semibold text-teal-700">
            ← Back to donations
          </Link>
          {user && (
            <button
              onClick={handleToggleSave}
              disabled={savingState}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <span>{isSaved ? '❤️' : '🤍'}</span>
              {isSaved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          {/* Images */}
          <div>
            <div
              className="h-[420px] rounded-lg bg-gray-200 bg-cover bg-center shadow"
              style={{ backgroundImage: selectedImage ? `url(${cld(selectedImage, 1000)})` : undefined }}
            />
            {donation.images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {donation.images.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => setSelectedImage(imageUrl)}
                    className={`h-20 rounded border bg-cover bg-center ${
                      selectedImage === imageUrl ? 'border-teal-600 ring-2 ring-teal-200' : 'border-gray-200'
                    }`}
                    style={{ backgroundImage: `url(${cld(imageUrl, 200)})` }}
                    aria-label="View donation image"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                  {getCategoryName(donation.category)}
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold capitalize text-gray-700">
                  {donation.condition}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{donation.title}</h1>
              <p className="mt-4 whitespace-pre-wrap text-gray-700">{donation.description}</p>
              <div className="mt-6 space-y-3 border-t pt-5 text-sm text-gray-700">
                <div><span className="font-semibold text-gray-900">City: </span>{donation.location.city}</div>
                {privateAddress ? (
                  <div><span className="font-semibold text-gray-900">Pickup address: </span>{privateAddress}</div>
                ) : (
                  <div className="text-gray-500"><span className="font-semibold text-gray-900">Pickup address: </span>{user ? 'Shared once you connect with the donor' : 'Sign in and connect with the donor to view the exact address'}</div>
                )}
                <div><span className="font-semibold text-gray-900">Posted: </span>{formatDate(donation.createdAt)}</div>
                <div><span className="font-semibold text-gray-900">Views: </span>{donation.viewCount}</div>
              </div>
              <SafetyNotice className="mt-5" />
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-bold text-gray-900">Donor Info</h2>
                {donorRating.count > 0 && (
                  <div className="flex flex-col items-end">
                    <StarRating value={Math.round(donorRating.avg)} size="sm" />
                    <span className="mt-0.5 text-xs text-gray-400">
                      {donorRating.avg} ({donorRating.count} review{donorRating.count !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </div>

              {donor ? (
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div><span className="font-semibold text-gray-900">Name: </span>{donor.name || 'Donor'}</div>
                  <div><span className="font-semibold text-gray-900">City: </span>{donor.city || donation.location.city}</div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">Donor profile details are not available yet.</p>
              )}

              {user && !isOwner && donation.status === 'active' && (
                <Button
                  variant={isInterested ? 'outline' : 'secondary'}
                  className="mt-5 w-full"
                  disabled={togglingInterest}
                  onClick={handleToggleInterest}
                >
                  {togglingInterest
                    ? '...'
                    : isInterested
                    ? `✓ Interested (${donation.interestedUsers.length})`
                    : `Show Interest (${donation.interestedUsers.length})`}
                </Button>
              )}

              {isOwner ? (
                <Link href="/my-donations" className="mt-5 block">
                  <Button variant="outline" className="w-full">Manage Your Donation</Button>
                </Link>
              ) : user ? (
                <Button className="mt-5 w-full" disabled={startingChat} onClick={handleMessageDonor}>
                  {startingChat ? 'Opening chat…' : 'Message Donor'}
                </Button>
              ) : (
                <Link href="/login" className="mt-5 block">
                  <Button className="w-full">Login to Message</Button>
                </Link>
              )}

              {user && !isOwner && (
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="mt-4 w-full text-center text-xs font-medium text-gray-400 hover:text-red-500"
                >
                  ⚑ Report this listing
                </button>
              )}
            </div>
          </aside>
        </div>

        {donation && (
          <ReportDialog
            open={showReport}
            onClose={() => setShowReport(false)}
            title="Report this listing"
            target={{ targetUserId: donation.userId, donationId: donation.id }}
          />
        )}

        {/* Reviews */}
        <div className="mt-10">
          <h2 className="mb-5 text-2xl font-bold text-gray-900">
            Reviews {reviews.length > 0 && <span className="text-lg font-normal text-gray-500">({reviews.length})</span>}
          </h2>

          {reviewHint && (
            <p className="mb-6 rounded-lg bg-white p-4 text-sm text-gray-500 shadow">{reviewHint}</p>
          )}

          {canReview && (
            <form onSubmit={handleSubmitReview} className="mb-6 rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Leave a Review</h3>
              {reviewError && <p className="mb-3 text-sm text-red-500">{reviewError}</p>}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">Rating</label>
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Comment <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Share your experience with this donor…"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <Button type="submit" disabled={submittingReview}>
                {submittingReview ? 'Submitting…' : 'Submit Review'}
              </Button>
            </form>
          )}

          {reviews.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-500">No reviews yet. Be the first to review this donor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg bg-white p-5 shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{review.reviewerName}</p>
                      <StarRating value={review.rating} size="sm" />
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm text-gray-700">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
