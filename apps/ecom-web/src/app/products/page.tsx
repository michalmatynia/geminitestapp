/* eslint-disable @typescript-eslint/strict-boolean-expressions, complexity, max-lines-per-function, no-console, no-nested-ternary */
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getMentiosProducts, getMentiosCategories } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';
import { CatalogPageClient } from '@/app/products/CatalogPageClient';
import { getProductsContent } from '@/lib/cms';
import { PRODUCTS_CONTENT_DEFAULTS } from '@/data/productsContent';
import { getRequestLocale } from '@/lib/request-locale';
import { getCategorySelectorTitle } from '@/lib/productFilterLabels';
import { productMatchesThemes } from '@/lib/productThemes';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

type RawParams = { q?: string; new?: string; category?: string; categories?: string; themes?: string; sort?: string; price?: string };
type SearchParams = Promise<RawParams>;

function parseFilterList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueFilters(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function hasActiveResultFilters(input: {
  categories: string[];
  newOnly: boolean;
  priceLabel: string;
  search: string | undefined;
  themes: string[];
}): boolean {
  return (
    input.search !== undefined ||
    input.newOnly ||
    input.categories.length > 0 ||
    input.themes.length > 0 ||
    input.priceLabel !== ''
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const params = (await (searchParams ?? Promise.resolve({}))) as RawParams;
  const locale = await getRequestLocale();
  const content = await getProductsContent(locale).catch(() => PRODUCTS_CONTENT_DEFAULTS);
  const search = params.q ?? undefined;
  const newOnly = params.new === '1';
  const category = params.category ?? '';
  const categories = uniqueFilters([...parseFilterList(params.categories), ...(category ? [category] : [])]);
  const themes = parseFilterList(params.themes);
  const selectorTitle = categories.length > 0
    ? getCategorySelectorTitle(categories)
    : themes.length > 0
      ? themes.join(', ')
      : '';
  const title = selectorTitle
    ? selectorTitle
    : newOnly
      ? content.collection.newArrivalsLabel
      : search
        ? `${content.collection.searchLabelPrefix}: "${search}"`
        : content.collection.allProductsLabel;

  const fullTitle = `${title} — STARGATER`;
  const description = locale === 'pl'
    ? 'Odkryj kolekcjonalia, pinsy i grafiki z anime, gier i filmów.'
    : 'Discover collectibles, pins, and art prints from anime, gaming, and film.';
  return {
    title: fullTitle,
    description,
    openGraph: {
      type: 'website',
      title: fullTitle,
      description,
      siteName: 'STARGATER',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
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
  const initialCategories = uniqueFilters([
    ...parseFilterList(params.categories),
    ...(initialCategory ? [initialCategory] : []),
  ]);
  const initialThemes = parseFilterList(params.themes);
  const initialSort = params.sort ?? 'featured';
  const initialPriceLabel = params.price ? decodeURIComponent(params.price) : '';

  // Content is needed before the products fetch so we can resolve the price label → range.
  const content = await getProductsContent(locale).catch(() => PRODUCTS_CONTENT_DEFAULTS);
  const priceRange = initialPriceLabel
    ? content.collection.priceRanges.find((r) => r.label === initialPriceLabel)
    : undefined;

  const [mentiosProductsResult, mentiosCategoriesResult] = await Promise.allSettled([
    getMentiosProducts({
      limit: PAGE_SIZE,
      search,
      newOnly,
      locale,
      categoryName: initialCategory || undefined,
      categoryNames: initialCategories,
      themeNames: initialThemes,
      sort: initialSort !== 'featured' ? initialSort : undefined,
      priceMin: priceRange?.min,
      priceMax: priceRange?.max ?? undefined,
    }),
    getMentiosCategories(locale),
  ]);

  if (mentiosProductsResult.status === 'rejected') {
    console.error('[products] Falling back to static catalog: failed to fetch Mentios products', mentiosProductsResult.reason);
  }
  if (mentiosCategoriesResult.status === 'rejected') {
    console.error('[products] Falling back to static catalog: failed to fetch Mentios categories', mentiosCategoriesResult.reason);
  }

  const { products: dbProducts, total: dbTotal } = mentiosProductsResult.status === 'fulfilled'
    ? mentiosProductsResult.value
    : { products: [], total: 0 };
  const dbCategories = mentiosCategoriesResult.status === 'fulfilled'
    ? mentiosCategoriesResult.value
    : [];

  const activeResultFilters = hasActiveResultFilters({
    categories: initialCategories,
    newOnly,
    priceLabel: initialPriceLabel,
    search,
    themes: initialThemes,
  });
  const hasDbData = mentiosProductsResult.status === 'fulfilled' &&
    (dbProducts.length > 0 || dbTotal > 0 || activeResultFilters);
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
    if (initialCategories.length > 0) {
      const selected = new Set(initialCategories);
      filtered = filtered.filter((p) => selected.has(p.category));
    }
    if (initialThemes.length > 0) {
      filtered = filtered.filter((p) => productMatchesThemes(p, initialThemes));
    }
    if (priceRange) {
      filtered = filtered.filter(
        (p) => p.price >= priceRange.min && (priceRange.max === null || p.price < priceRange.max),
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
        categories: initialCategories,
        themes: initialThemes,
        sort: initialSort,
        priceLabel: initialPriceLabel,
        search: search ?? '',
        newOnly,
      }}
    />
  );
}
