import { auth, db } from './firebase';
import { addDoc, collection } from 'firebase/firestore';
import { track } from './analytics';

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'fake_item'
  | 'harassment'
  | 'inappropriate'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'scam', label: 'Scam / fraud' },
  { value: 'fake_item', label: 'Fake or misleading item' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

export interface CreateReportInput {
  targetUserId: string;
  donationId?: string;
  messageId?: string;
  conversationId?: string;
  reason: ReportReason;
  description?: string;
}

/**
 * Files a trust & safety report. Rules enforce: reporter == caller, no
 * self-reports, valid reason, status starts 'open'. Admins triage from the
 * Reports queue.
 */
export async function submitReport(input: CreateReportInput): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to report.');
  if (uid === input.targetUserId) throw new Error("You can't report yourself.");

  await addDoc(collection(db, 'reports'), {
    reporterId: uid,
    targetUserId: input.targetUserId,
    donationId: input.donationId ?? '',
    messageId: input.messageId ?? '',
    conversationId: input.conversationId ?? '',
    reason: input.reason,
    description: (input.description ?? '').slice(0, 1000).trim(),
    status: 'open',
    createdAt: new Date(),
  });

  track('report_submitted', { reason: input.reason, hasDonation: !!input.donationId });
}
