import type { MetadataRoute } from 'next';

const BASE = 'https://donow.co.in';

/**
 * Static sitemap for the public, indexable pages. Dynamic donation detail
 * pages are intentionally excluded: they churn (created/completed constantly)
 * and would need a Firestore read per build — the browse feed is the canonical
 * entry point search engines should index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ['', '/donations', '/login', '/signup', '/privacy', '/terms'];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === '/donations' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));
}
