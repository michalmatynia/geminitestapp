import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { COLLECTIONS, getProductsByCollection } from '@/data/products';
import { getMentiosProducts } from '@/lib/mentios';
import { CollectionPageClient } from './CollectionPageClient';
import { getProductsContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

function collectionLabel(slug: string, fallback: string, locale: string): string {
  if (locale !== 'pl') return fallback;
  return ({
    womenswear: 'Anime',
    menswear: 'Gaming',
    accessories: 'Film i TV',
    objects: 'Wszystkie produkty',
  } as Record<string, string>)[slug] ?? fallback;
}

export async function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return {};
  const title = `${collectionLabel(slug, collection.label, locale)} - ARCANA`;
  const description = `Shop the ${collection.label} collection — ARCANA`;
  return {
    title,
    description,
    openGraph: { type: 'website', title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default async function CollectionPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) notFound();

  // Fetch first page from DB and CMS content in parallel.
  const [{ products: dbProducts, total: dbTotal }, content] = await Promise.all([
    getMentiosProducts({ limit: PAGE_SIZE, collectionSlug: slug, locale }),
    getProductsContent(locale),
  ]);

  const isLive = dbProducts.length > 0;
  const products = isLive ? dbProducts : getProductsByCollection(slug);
  const total = isLive ? dbTotal : collection.count;
  const source: 'mentios' | 'static' = isLive ? 'mentios' : 'static';

  return (
    <CollectionPageClient
      collection={{ ...collection, label: collectionLabel(slug, collection.label, locale), count: total }}
      products={products}
      total={total}
      source={source}
      content={content}
    />
  );
}
