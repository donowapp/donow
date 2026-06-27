import type { MetadataRoute } from 'next';

/**
 * robots.txt — allow public pages, disallow authenticated/admin/API surfaces
 * so crawlers don't waste budget on (or index) private areas.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/messages', '/my-donations', '/saved', '/dashboard'],
    },
    sitemap: 'https://donow.co.in/sitemap.xml',
  };
}
