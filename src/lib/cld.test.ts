import { describe, it, expect } from 'vitest';
import { cld } from './cld';

describe('cld() — Cloudinary URL transform', () => {
  const base = 'https://res.cloudinary.com/demo/image/upload/v123/donow/u/abc/pic.jpg';

  it('returns empty string for null/undefined/empty input', () => {
    expect(cld('')).toBe('');
    expect(cld(undefined)).toBe('');
    expect(cld(null)).toBe('');
  });

  it('injects transform params with the default width (400)', () => {
    expect(cld(base)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_400/v123/donow/u/abc/pic.jpg'
    );
  });

  it('honours a custom width', () => {
    expect(cld(base, 200)).toContain('w_200/');
    expect(cld(base, 1080)).toContain('w_1080/');
  });

  it('passes through non-Cloudinary URLs untouched (e.g. Unsplash)', () => {
    const u = 'https://images.unsplash.com/photo-123?w=400&q=80';
    expect(cld(u)).toBe(u);
  });

  it('does NOT transform a lookalike host that merely contains /upload/', () => {
    const u = 'https://evil.example.com/upload/v1/x.jpg';
    expect(cld(u)).toBe(u);
  });

  it('is idempotent — does not double-transform an already-transformed URL', () => {
    const transformed = cld(base);
    expect(cld(transformed)).toBe(transformed);
  });

  it('skips when the path already starts with a known transform token', () => {
    const pre = 'https://res.cloudinary.com/demo/image/upload/q_auto/v1/a.jpg';
    expect(cld(pre)).toBe(pre);
  });
});
