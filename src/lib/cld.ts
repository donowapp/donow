/**
 * Cloudinary delivery optimization.
 *
 * Stored URLs point at the full-resolution original (often 1–5 MB). At render
 * time we inject `f_auto,q_auto,c_fill,w_<width>` so Cloudinary serves a
 * right-sized, auto-format (WebP/AVIF), auto-quality variant instead — typically
 * a 70–90% byte reduction with no perceptible quality loss.
 *
 * With only a width set, `c_fill` resizes proportionally (no hard crop), so the
 * aspect ratio is preserved; the CSS box (object-cover / background cover) does
 * the final framing. Non-Cloudinary URLs (Unsplash, local, data: blobs) are
 * returned untouched.
 *
 * Suggested widths: avatar 96, card 400, chat 600, detail 1000.
 */
export function cld(url: string | undefined | null, width = 400): string {
  if (!url) return '';
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1 || !url.includes('res.cloudinary.com')) return url;
  const rest = url.slice(i + marker.length);
  // Already transformed (path segment starts with a known transform token) — skip.
  if (/^(f_|q_|c_|w_|h_|dpr_|e_)/.test(rest)) return url;
  return `${url.slice(0, i)}${marker}f_auto,q_auto,c_fill,w_${width}/${rest}`;
}
