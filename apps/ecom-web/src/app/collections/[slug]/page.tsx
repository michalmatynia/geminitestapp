import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { COLLECTIONS, getProductsByCollection } from '@/data/products';
import { getMentiosProducts } from '@/lib/mentios';
import { CollectionPageClient } from './CollectionPageClient';
import { getProductsContent } from '@/lib/cms';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 120;

const PAGE_SIZE = 24;

export async function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return {};
  return { title: `${collection.label} — ARCANA` };
}

export default async function CollectionPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) notFound();

  // Fetch first page from DB, fall back to static demo data.
  const { products: dbProducts, total: dbTotal } = await getMentiosProducts({
    limit: PAGE_SIZE,
    collectionSlug: slug,
  });

  const isLive = dbProducts.length > 0;
  const products = isLive ? dbProducts : getProductsByCollection(slug);
  const total = isLive ? dbTotal : collection.count;
  const source: 'mentios' | 'static' = isLive ? 'mentios' : 'static';
  const content = await getProductsContent();

  return (
    <CollectionPageClient
      collection={{ ...collection, count: total }}
      products={products}
      total={total}
      source={source}
      content={content}
    />
  );
}
