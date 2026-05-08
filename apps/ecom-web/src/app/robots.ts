import type { MetadataRoute } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_ECOM_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3001');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cms',
          '/account',
          '/checkout',
          '/wishlist',
          '/uploads/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
