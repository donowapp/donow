import { describe, it, expect, vi, afterEach } from 'vitest';
import { track } from './analytics';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('track() — analytics funnel', () => {
  it('is a no-op (and never throws) when window is undefined (SSR)', () => {
    // vitest node env: window is already undefined here.
    expect(() => track('sign_up', { a: 1 })).not.toThrow();
  });

  it('forwards to gtag when available', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag });
    track('donation_created', { donationId: 'd1' });
    expect(gtag).toHaveBeenCalledWith('event', 'donation_created', { donationId: 'd1' });
  });

  it('falls back to dataLayer.push when gtag is absent', () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal('window', { dataLayer });
    track('donation_viewed', { category: 'books' });
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toEqual({ event: 'donation_viewed', category: 'books' });
  });

  it('never throws even if gtag itself throws (best-effort)', () => {
    vi.stubGlobal('window', {
      gtag: () => {
        throw new Error('boom');
      },
    });
    expect(() => track('review_submitted')).not.toThrow();
  });

  it('does nothing harmful when neither gtag nor dataLayer exist', () => {
    vi.stubGlobal('window', {});
    expect(() => track('chat_started')).not.toThrow();
  });
});
