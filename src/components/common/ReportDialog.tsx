'use client';

import { useState } from 'react';
import { REPORT_REASONS, ReportReason, submitReport, CreateReportInput } from '@/lib/reports';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Everything about what's being reported except the reason/description. */
  target: Omit<CreateReportInput, 'reason' | 'description'>;
  title?: string;
}

export function ReportDialog({ open, onClose, target, title = 'Report' }: Props) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({ ...target, reason, description });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <div className="text-4xl">✅</div>
            <h3 className="mt-3 text-lg font-bold text-gray-900">Report submitted</h3>
            <p className="mt-1 text-sm text-gray-500">Thanks — our team will review it shortly.</p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tell us what&apos;s wrong. Submitting false reports may affect your account.
            </p>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-teal-600"
                  />
                  <span className="text-sm text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="Add details (optional)"
              className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
