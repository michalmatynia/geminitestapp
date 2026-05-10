import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getProduct, PRODUCTS } from '@/data/products';
import { getMentiosProduct, getMentiosProducts, getMentiosCategoryIdByName } from '@/lib/mentios';
import { ProductDetailClient } from './ProductDetailClient';
import { getProductsContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const dbProduct = await getMentiosProduct(slug, locale);
  const product = dbProduct ?? getProduct(slug);
  if (!product) return {};
  const title = `${product.name} — ARCANA`;
  const description = product.description.slice(0, 155);
  const images = product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : [];
  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images[0] ? { images: [images[0].url] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const locale = await getRequestLocale();

  // Try DB first, fall back to static demo data. Fetch CMS content in parallel.
  const [dbProduct, content] = await Promise.all([
    getMentiosProduct(slug, locale),
    getProductsContent(locale),
  ]);
  const product = dbProduct ?? getProduct(slug);
  if (!product) notFound();

  const getTheme = (name: string) => name.split(' | ')[4]?.trim() ?? '';
  const productTheme = getTheme(product.name);

  const pickRelated = (pool: typeof PRODUCTS): typeof PRODUCTS => {
    const others = pool.filter((p) => p.id !== product.id);
    // Try: same category + same theme
    if (productTheme) {
      const exact = others.filter(
        (p) => p.category === product.category && getTheme(p.name) === productTheme,
      );
      if (exact.length > 0) return exact.slice(0, 4);
    }
    // Fallback: same category only
    return others.filter((p) => p.category === product.category).slice(0, 4);
  };

  let related = pickRelated(PRODUCTS);

  if (dbProduct) {
    const categoryId = await getMentiosCategoryIdByName(product.category, locale);
    const { products: dbPool } = await getMentiosProducts({
      limit: 6,
      locale,
      ...(categoryId ? { categoryId } : {}),
    });
    const picked = pickRelated(dbPool);
    if (picked.length > 0) related = picked;
  }

  return <ProductDetailClient product={product} related={related} content={content} />;
}
