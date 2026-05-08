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
const plUrl = (path: string) => `${siteUrl}/pl${path === '/' ? '' : path}`;

function bothLocales(
  path: string,
  opts: Omit<MetadataRoute.Sitemap[number], 'url'>,
): MetadataRoute.Sitemap {
  return [
    { url: url(path), ...opts },
    { url: plUrl(path), ...opts },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    ...bothLocales('/', { lastModified: now, changeFrequency: 'daily',   priority: 1.0 }),
    ...bothLocales('/products', { lastModified: now, changeFrequency: 'daily',   priority: 0.9 }),
    ...bothLocales('/stories',  { lastModified: now, changeFrequency: 'weekly',  priority: 0.7 }),
    ...bothLocales('/lookbook', { lastModified: now, changeFrequency: 'weekly',  priority: 0.7 }),
    ...bothLocales('/about',    { lastModified: now, changeFrequency: 'monthly', priority: 0.5 }),
    ...bothLocales('/values',   { lastModified: now, changeFrequency: 'monthly', priority: 0.5 }),
    ...bothLocales('/contact',  { lastModified: now, changeFrequency: 'monthly', priority: 0.4 }),
  ];

  const collectionPages: MetadataRoute.Sitemap = COLLECTIONS.flatMap((c) =>
    bothLocales(`/collections/${c.slug}`, {
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    }),
  );

  // Products: prefer live DB slugs, fall back to static seed data
  const [dbSlugs, stories] = await Promise.all([
    getMentiosSlugs(),
    getAllStories(),
  ]);

  const productSlugs = dbSlugs.length > 0
    ? dbSlugs
    : PRODUCTS.map((p) => p.slug);

  const productPages: MetadataRoute.Sitemap = productSlugs.flatMap((slug) =>
    bothLocales(`/products/${slug}`, {
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
  );

  const storyPages: MetadataRoute.Sitemap = stories.flatMap((s) =>
    bothLocales(`/stories/${s.slug}`, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }),
  );

  return [...staticPages, ...collectionPages, ...productPages, ...storyPages];
}
