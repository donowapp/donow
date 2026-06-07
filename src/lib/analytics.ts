/**
 * Product analytics funnel (web → GA4).
 *
 * `track()` forwards events to GA4 via the global `gtag` loaded by
 * <Analytics/> (falls back to dataLayer if gtag isn't ready). It is completely
 * best-effort: analytics must NEVER throw into the UI, so every path is guarded.
 *
 * Mobile mirrors these exact event names via a Firestore sink so the funnel is
 * unified across platforms.
 */
export type AnalyticsEvent =
  | 'sign_up'
  | 'email_verified'
  | 'donation_created'
  | 'donation_viewed'
  | 'interest_expressed'
  | 'chat_started'
  | 'address_revealed'
  | 'donation_completed'
  | 'review_submitted'
  | 'report_submitted'
  | 'upload_failed';

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, props);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...props });
    }
  } catch {
    /* analytics is best-effort — never surface to the user */
  }
}
