import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pravasatransworld.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy', '/terms'],
        disallow: [
          '/dashboard',
          '/applications',
          '/apply',
          '/my-visas',
          '/notifications',
          '/document-vault',
          '/profile',
          '/payment-history',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
