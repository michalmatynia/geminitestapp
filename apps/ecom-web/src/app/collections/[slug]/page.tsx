import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { COLLECTIONS, getProductsByCollection } from '@/data/products';
import { CollectionPageClient } from './CollectionPageClient';

type Props = { params: Promise<{ slug: string }> };

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
  const products = getProductsByCollection(slug);
  return <CollectionPageClient collection={collection} products={products} />;
}
