import type { MetadataRoute } from 'next';
import { PRODUCTS, COLLECTIONS } from '@/data/products';
import { getMentiosSlugs } from '@/lib/mentios';
import { getAllStories } from '@/lib/storiesCms';

const siteUrl =
  process.env.NEXT_PUBLIC_ECOM_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3001');

const url = (path: string) => `${siteUrl}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: url('/products'), lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: url('/stories'),  lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: url('/lookbook'), lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: url('/about'),    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/values'),   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/contact'),  lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const collectionPages: MetadataRoute.Sitemap = COLLECTIONS.map((c) => ({
    url: url(`/collections/${c.slug}`),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Products: prefer live DB slugs, fall back to static seed data
  const [dbSlugs, stories] = await Promise.all([
    getMentiosSlugs(),
    getAllStories(),
  ]);

  const productSlugs = dbSlugs.length > 0
    ? dbSlugs
    : PRODUCTS.map((p) => p.slug);

  const productPages: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: url(`/products/${slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const storyPages: MetadataRoute.Sitemap = stories.map((s) => ({
    url: url(`/stories/${s.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticPages, ...collectionPages, ...productPages, ...storyPages];
}
