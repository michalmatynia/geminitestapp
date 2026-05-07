import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getProduct, PRODUCTS } from '@/data/products';
import { ProductDetailClient } from './ProductDetailClient';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} — ARCANA`,
    description: product.description.slice(0, 155),
  };
}

export default async function ProductPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = PRODUCTS.filter(
    (p) => p.collectionSlug === product.collectionSlug && p.id !== product.id,
  ).slice(0, 4);

  return <ProductDetailClient product={product} related={related} />;
}
