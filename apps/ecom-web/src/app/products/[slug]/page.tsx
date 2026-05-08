import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getProduct, PRODUCTS } from '@/data/products';
import { getMentiosProduct, getMentiosProducts } from '@/lib/mentios';
import { ProductDetailClient } from './ProductDetailClient';
import { getProductsContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const dbProduct = await getMentiosProduct(slug, locale);
  const product = dbProduct ?? getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} — ARCANA`,
    description: product.description.slice(0, 155),
  };
}

export default async function ProductPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const locale = await getRequestLocale();

  // Try DB first, fall back to static demo data.
  const dbProduct = await getMentiosProduct(slug, locale);
  const product = dbProduct ?? getProduct(slug);
  if (!product) notFound();

  // Fetch related products from the same collection.
  let related = PRODUCTS.filter(
    (p) => p.collectionSlug === product.collectionSlug && p.id !== product.id,
  ).slice(0, 4);

  if (dbProduct) {
    const { products: dbRelated } = await getMentiosProducts({ limit: 5, collectionSlug: product.collectionSlug, locale });
    const filtered = dbRelated.filter((p) => p.id !== product.id).slice(0, 4);
    if (filtered.length > 0) related = filtered;
  }

  const content = await getProductsContent(locale);

  return <ProductDetailClient product={product} related={related} content={content} />;
}
