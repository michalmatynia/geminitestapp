import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getMentiosProducts } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';
import { CollectionPageClient } from '@/app/collections/[slug]/CollectionPageClient';

export const metadata: Metadata = { title: 'All Products — ARCANA' };
export const revalidate = 120;

const PAGE_SIZE = 24;

type SearchParams = Promise<{ q?: string; new?: string }>;

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const params = await (searchParams ?? Promise.resolve({})) as { q?: string; new?: string };
  const search = params.q ?? undefined;
  const newOnly = params.new === '1';

  const label = newOnly ? 'New Arrivals' : search ? `Search: "${search}"` : 'All Products';

  const { products: dbProducts, total: dbTotal } = await getMentiosProducts({
    limit: PAGE_SIZE,
    search,
    newOnly,
  });

  const hasDbData = dbProducts.length > 0;
  let products = hasDbData ? dbProducts : PRODUCTS.slice(0, PAGE_SIZE);
  let total = hasDbData ? dbTotal : PRODUCTS.length;

  // Static fallback filtering when DB returned nothing
  if (!hasDbData && search) {
    const q = (search as string).toLowerCase();
    const filtered = PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
    total = filtered.length;
    products = filtered.slice(0, PAGE_SIZE);
  } else if (!hasDbData && newOnly) {
    const filtered = PRODUCTS.filter((p) => p.isNew);
    total = filtered.length;
    products = filtered.slice(0, PAGE_SIZE);
  }

  const source: 'mentios' | 'static' = hasDbData ? 'mentios' : 'static';

  return (
    <CollectionPageClient
      collection={{ slug: 'all', label, count: total }}
      products={products}
      total={total}
      source={source}
    />
  );
}
