import type { NextConfig } from "next";

// Content Security Policy. Rolled out REPORT-ONLY first: it blocks nothing, it
// only reports what *would* be blocked, so we can confirm nothing legitimate
// breaks before switching the header name to "Content-Security-Policy".
//
// Source inventory:
//  - Firebase Auth/Firestore: *.googleapis.com, *.firebaseio.com, securetoken/identitytoolkit
//  - Firebase App Check (reCAPTCHA v3): www.google.com, www.gstatic.com
//  - Analytics/pixels (admin-configurable, ID-validated): Google + Meta
//  - Cloudinary images + upload: res.cloudinary.com, api.cloudinary.com
//  - Next.js requires 'unsafe-inline' for its bootstrap until nonces are wired
//    (the enforcement step replaces 'unsafe-inline' with a per-request nonce).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://api.cloudinary.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://www.google.com",
  "frame-src 'self' https://www.google.com https://td.doubleclick.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Baseline security headers applied to every route.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Report-only for now — flip the key to "Content-Security-Policy" to enforce.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
