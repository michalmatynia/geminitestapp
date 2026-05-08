import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getMentiosProducts, getMentiosCategories } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';
import { CatalogPageClient } from '@/app/products/CatalogPageClient';
import { getProductsContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export const revalidate = 120;

const PAGE_SIZE = 48;

type RawParams = { q?: string; new?: string; category?: string; sort?: string; price?: string };
type SearchParams = Promise<RawParams>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const params = (await (searchParams ?? Promise.resolve({}))) as RawParams;
  const locale = await getRequestLocale();
  const content = await getProductsContent(locale);
  const search = params.q ?? undefined;
  const newOnly = params.new === '1';
  const category = params.category ?? '';
  const title = category
    ? category
    : newOnly
      ? content.collection.newArrivalsLabel
      : search
        ? `${content.collection.searchLabelPrefix}: "${search}"`
        : content.collection.allProductsLabel;

  return { title: `${title} — ARCANA` };
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const params = (await (searchParams ?? Promise.resolve({}))) as RawParams;
  const locale = await getRequestLocale();

  const search = params.q ?? undefined;
  const newOnly = params.new === '1';
  const initialCategory = params.category ?? '';
  const initialSort = params.sort ?? 'featured';
  const initialPriceLabel = params.price ? decodeURIComponent(params.price) : '';

  // Content is needed before the products fetch so we can resolve the price label → range.
  const content = await getProductsContent(locale);
  const priceRange = initialPriceLabel
    ? content.collection.priceRanges.find((r) => r.label === initialPriceLabel)
    : undefined;

  const [{ products: dbProducts, total: dbTotal }, dbCategories] = await Promise.all([
    getMentiosProducts({
      limit: PAGE_SIZE,
      search,
      newOnly,
      locale,
      categoryName: initialCategory || undefined,
      sort: initialSort !== 'featured' ? initialSort : undefined,
      priceMin: priceRange?.min,
      priceMax: priceRange?.max ?? undefined,
    }),
    getMentiosCategories(locale),
  ]);

  const hasDbData = dbProducts.length > 0;
  const staticInStock = PRODUCTS.filter((p) => !p.isSoldOut);
  let products = hasDbData ? dbProducts : staticInStock.slice(0, PAGE_SIZE);
  let total = hasDbData ? dbTotal : staticInStock.length;

  if (!hasDbData) {
    let filtered = staticInStock;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (newOnly) filtered = filtered.filter((p) => p.isNew);
    if (initialCategory) filtered = filtered.filter((p) => p.category === initialCategory);
    if (priceRange) {
      filtered = filtered.filter(
        (p) => p.price >= priceRange.min && (priceRange.max == null || p.price < priceRange.max),
      );
    }
    total = filtered.length;
    products = filtered.slice(0, PAGE_SIZE);
  }

  const categories = dbCategories.length > 0
    ? dbCategories
    : [...new Set(staticInStock.map((p) => p.category))]
        .sort()
        .map((name) => ({
          id: name,
          name,
          count: staticInStock.filter((p) => p.category === name).length,
        }));

  const source: 'mentios' | 'static' = hasDbData ? 'mentios' : 'static';

  return (
    <CatalogPageClient
      products={products}
      total={total}
      source={source}
      content={content}
      categories={categories}
      initialFilters={{
        category: initialCategory,
        sort: initialSort,
        priceLabel: initialPriceLabel,
        search: search ?? '',
        newOnly,
      }}
    />
  );
}
