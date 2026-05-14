/* eslint-disable @typescript-eslint/strict-boolean-expressions, complexity, max-lines-per-function, no-console, no-nested-ternary */
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { getMentiosProducts, getMentiosCategories, getMentiosLoreNames, getMentiosMaxPrice } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';
import { CatalogPageClient } from '@/app/products/CatalogPageClient';
import { getProductsContent } from '@/lib/cms';
import { PRODUCTS_CONTENT_DEFAULTS } from '@/data/productsContent';
import { getRequestLocale } from '@/lib/request-locale';
import { getCategorySelectorTitle } from '@/lib/productFilterLabels';
import { productMatchesThemes } from '@/lib/productThemes';
import { getProductMaterial } from '@/lib/productMaterial';
import { getProductSizeInfo } from '@/lib/productSizeInfo';
import { getProductLore } from '@/lib/productLore';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

type RawParams = { q?: string; new?: string; category?: string; categories?: string; types?: string; parentCats?: string; themes?: string; materials?: string; sizes?: string; lores?: string; sort?: string; priceMin?: string; priceMax?: string };
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
  priceMin: number | undefined;
  priceMax: number | undefined;
  search: string | undefined;
  themes: string[];
}): boolean {
  return (
    input.search !== undefined ||
    input.newOnly ||
    input.categories.length > 0 ||
    input.themes.length > 0 ||
    input.priceMin !== undefined ||
    input.priceMax !== undefined
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
  const initialTypes = parseFilterList(params.types);
  const initialParentCats = parseFilterList(params.parentCats);
  const initialThemes = parseFilterList(params.themes);
  const initialMaterials = parseFilterList(params.materials);
  const initialSizes = parseFilterList(params.sizes);
  const initialLores = parseFilterList(params.lores);
  const initialSort = params.sort ?? 'featured';
  const initialPriceMin = params.priceMin !== undefined ? Number(params.priceMin) : undefined;
  const initialPriceMax = params.priceMax !== undefined ? Number(params.priceMax) : undefined;

  const content = await getProductsContent(locale).catch(() => PRODUCTS_CONTENT_DEFAULTS);

  const [mentiosProductsResult, mentiosCategoriesResult, mentiosLoreNamesResult, mentiosMaxPriceResult] = await Promise.allSettled([
    getMentiosProducts({
      limit: PAGE_SIZE,
      search,
      newOnly,
      locale,
      categoryName: initialCategory || undefined,
      categoryNames: initialCategories,
      themeNames: initialThemes,
      sort: initialSort !== 'featured' ? initialSort : undefined,
      priceMin: Number.isFinite(initialPriceMin) ? initialPriceMin : undefined,
      priceMax: Number.isFinite(initialPriceMax) ? initialPriceMax : undefined,
    }),
    getMentiosCategories(locale),
    getMentiosLoreNames(locale),
    getMentiosMaxPrice(),
  ]);

  if (mentiosProductsResult.status === 'rejected') {
    console.error('[products] Falling back to static catalog: failed to fetch Mentios products', mentiosProductsResult.reason);
  }
  if (mentiosCategoriesResult.status === 'rejected') {
    console.error('[products] Falling back to static catalog: failed to fetch Mentios categories', mentiosCategoriesResult.reason);
  }
  if (mentiosLoreNamesResult.status === 'rejected') {
    console.error('[products] Failed to fetch Mentios lore names', mentiosLoreNamesResult.reason);
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
    priceMin: Number.isFinite(initialPriceMin) ? initialPriceMin : undefined,
    priceMax: Number.isFinite(initialPriceMax) ? initialPriceMax : undefined,
    search,
    themes: [...initialThemes, ...initialTypes, ...initialParentCats],
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
    if (Number.isFinite(initialPriceMin)) filtered = filtered.filter((p) => p.price >= initialPriceMin!);
    if (Number.isFinite(initialPriceMax)) filtered = filtered.filter((p) => p.price <= initialPriceMax!);
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

  // Derive available material and size options from the current product set.
  const availableMaterialsSet = new Set<string>();
  const availableSizesSet = new Set<string>();
  for (const p of products) {
    const mat = getProductMaterial(p);
    if (mat.length > 0) availableMaterialsSet.add(mat);
    const sz = getProductSizeInfo(p);
    if (sz.length > 0) availableSizesSet.add(sz);
  }
  const availableMaterials = [...availableMaterialsSet].sort();
  const availableSizes = [...availableSizesSet].sort();

  // Lores come from the full catalog scan, not just the current page.
  const dbLoreNames = mentiosLoreNamesResult.status === 'fulfilled' ? mentiosLoreNamesResult.value : [];
  const availableLores = dbLoreNames.length > 0
    ? dbLoreNames.map((l) => l.name)
    : [...new Set(PRODUCTS.filter((p) => !p.isSoldOut).map((p) => getProductLore(p)).filter((l) => l.length > 0))].sort();

  // Max price — from DB aggregate; fall back to static product set ceiling rounded up to nearest 50.
  const dbMaxPrice = mentiosMaxPriceResult.status === 'fulfilled' ? mentiosMaxPriceResult.value : null;
  const staticMaxPrice = Math.ceil(
    Math.max(0, ...PRODUCTS.filter((p) => !p.isSoldOut).map((p) => p.price)) / 10,
  ) * 10;
  const sliderMaxPrice = dbMaxPrice ?? (staticMaxPrice > 0 ? staticMaxPrice : 5000);

  return (
    <CatalogPageClient
      products={products}
      total={total}
      source={source}
      content={content}
      categories={categories}
      availableMaterials={availableMaterials}
      availableSizes={availableSizes}
      availableLores={availableLores}
      sliderMaxPrice={sliderMaxPrice}
      initialFilters={{
        category: initialCategory,
        categories: initialCategories,
        types: initialTypes,
        parentCats: initialParentCats,
        themes: initialThemes,
        materials: initialMaterials,
        sizes: initialSizes,
        lores: initialLores,
        sort: initialSort,
        priceMin: Number.isFinite(initialPriceMin) ? initialPriceMin : undefined,
        priceMax: Number.isFinite(initialPriceMax) ? initialPriceMax : undefined,
        search: search ?? '',
        newOnly,
      }}
    />
  );
}
