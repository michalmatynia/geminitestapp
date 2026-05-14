import { NextResponse, type NextRequest } from 'next/server';
import { getMentiosProducts } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';
import { normalizeLocale } from '@/lib/locales';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_CATALOG_FILTER_ITEMS = 60;
const MAX_QUERY_TEXT_LENGTH = 250;
const MAX_IDS = 200;
const MAX_SKIP = 5_000;

function parseFilterList(searchParams: URLSearchParams, key: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of searchParams.getAll(key)) {
    for (const item of raw.split(',')) {
      const normalized = item.trim();
      if (normalized.length === 0 || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

function parseLimit(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

function parseSkip(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_SKIP);
}

function sanitizeIds(raw: string | null): string[] {
  if (raw === null || raw.length === 0) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 64)
    .slice(0, MAX_IDS);
}

function clampText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  return normalized.slice(0, MAX_QUERY_TEXT_LENGTH);
}

const VALID_SORT_VALUES = new Set(['featured', 'price-asc', 'price-desc', 'newest', 'name-asc', 'name-desc', 'category']);

function isValidSort(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value.length === 0) return true;
  return VALID_SORT_VALUES.has(value);
}

function productMatchesThemes(product: { lore?: string; name: string }, themes: string[]): boolean {
  if (themes.length === 0) return true;
  const lore = product.lore?.toLowerCase() ?? '';
  const name = product.name.toLowerCase();
  return themes.some((theme) => {
    const query = theme.toLowerCase();
    return lore.includes(query) || name.includes(query);
  });
}

function hasResultFilters(input: {
  categoryNames: string[];
  collectionSlug: string | undefined;
  ids: string[];
  newOnly: boolean;
  priceMax: number | undefined;
  priceMin: number | undefined;
  search: string | undefined;
  themeNames: string[];
}): boolean {
  return (
    input.collectionSlug !== undefined ||
    input.categoryNames.length > 0 ||
    input.themeNames.length > 0 ||
    input.search !== undefined ||
    input.ids.length > 0 ||
    input.newOnly ||
    input.priceMin !== undefined ||
    input.priceMax !== undefined
  );
}

// eslint-disable-next-line max-lines-per-function, complexity
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`products-api:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }
  const { searchParams } = req.nextUrl;
  const collectionSlug = searchParams.get('collection') ?? undefined;
  const categoryName = searchParams.get('category') ?? undefined;
  const rawCollectionSlug = collectionSlug?.trim();
  const rawCategoryName = categoryName?.trim();
  if (rawCollectionSlug !== undefined && rawCollectionSlug.length > MAX_QUERY_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Invalid collection filter' }, { status: 400 });
  }
  if (rawCategoryName !== undefined && rawCategoryName.length > MAX_QUERY_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Invalid category filter' }, { status: 400 });
  }

  const categoryNames = [
    ...parseFilterList(searchParams, 'categories'),
    ...(rawCategoryName === undefined ? [] : [rawCategoryName]),
  ];
  const themeNames = parseFilterList(searchParams, 'themes');
  const materialNames = parseFilterList(searchParams, 'materials');
  const sizeNames = parseFilterList(searchParams, 'sizes');
  const loreNames = parseFilterList(searchParams, 'lores');
  const search = searchParams.get('q') ?? undefined;
  const limit = parseLimit(searchParams.get('limit'), 100, 200);
  const skip = parseSkip(searchParams.get('skip'));
  const ids = sanitizeIds(searchParams.get('ids'));
  const newOnly = searchParams.get('new') === '1';
  const localeValue = clampText(searchParams.get('locale') ?? req.headers.get('x-ecom-locale'));
  const locale = normalizeLocale(localeValue ?? null);
  const sort = clampText(searchParams.get('sort'));
  const priceMinRaw = clampText(searchParams.get('priceMin'));
  const priceMaxRaw = clampText(searchParams.get('priceMax'));
  const priceMin = priceMinRaw === undefined ? undefined : Number(priceMinRaw);
  const priceMax = priceMaxRaw === undefined ? undefined : Number(priceMaxRaw);

  const safeCategoryName = clampText(rawCategoryName);
  const safeCollectionSlug = clampText(rawCollectionSlug);

  if (search !== undefined && search.length > MAX_QUERY_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Search query is too long' }, { status: 400 });
  }
  if (!isValidSort(sort)) {
    return NextResponse.json({ error: 'Invalid sort' }, { status: 400 });
  }
  if (themeNames.length > MAX_CATALOG_FILTER_ITEMS || categoryNames.length > MAX_CATALOG_FILTER_ITEMS ||
      materialNames.length > MAX_CATALOG_FILTER_ITEMS || sizeNames.length > MAX_CATALOG_FILTER_ITEMS ||
      loreNames.length > MAX_CATALOG_FILTER_ITEMS) {
    return NextResponse.json({ error: 'Too many filter values' }, { status: 400 });
  }
  for (const value of [...themeNames, ...categoryNames, ...materialNames, ...sizeNames, ...loreNames]) {
    if (value.length > MAX_QUERY_TEXT_LENGTH) {
      return NextResponse.json({ error: 'Invalid filter value length' }, { status: 400 });
    }
  }
  if ((priceMin !== undefined && (!Number.isFinite(priceMin) || priceMin < 0)) ||
      (priceMax !== undefined && (!Number.isFinite(priceMax) || priceMax < 0))) {
    return NextResponse.json({ error: 'Invalid price filters' }, { status: 400 });
  }
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    return NextResponse.json({ error: 'Invalid price range' }, { status: 400 });
  }

  const { products, total } = await getMentiosProducts({
    limit,
    skip,
    collectionSlug: safeCollectionSlug,
    categoryName: safeCategoryName,
    categoryNames,
    themeNames,
    loreNames,
    search: search?.slice(0, MAX_QUERY_TEXT_LENGTH),
    ids,
    newOnly,
    locale,
    sort,
    priceMin,
    priceMax,
  });
  const hasFilters = hasResultFilters({
    categoryNames,
    collectionSlug: safeCollectionSlug,
    ids,
    newOnly,
    priceMax,
    priceMin,
    search: search?.slice(0, MAX_QUERY_TEXT_LENGTH),
    themeNames,
  });

  // Fall back to static demo products when DB is not configured or empty.
  if (products.length === 0 && total === 0 && !hasFilters) {
    let staticProducts = (collectionSlug === undefined
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.collectionSlug === collectionSlug)
    ).filter((p) => p.isSoldOut !== true);

    if (categoryNames.length > 0) {
      const selected = new Set(categoryNames);
      staticProducts = staticProducts.filter((p) => selected.has(p.category));
    }

    if (themeNames.length > 0) {
      staticProducts = staticProducts.filter((p) => productMatchesThemes(p, themeNames));
    }

    if (materialNames.length > 0) {
      const materialSet = new Set(materialNames.map((m) => m.toLowerCase()));
      staticProducts = staticProducts.filter((p) => {
        const segments = p.name.split('|');
        const mat = (p.material?.trim() ?? segments[2]?.trim() ?? '').toLowerCase();
        return mat.length > 0 && materialSet.has(mat);
      });
    }

    if (sizeNames.length > 0) {
      const sizeSet = new Set(sizeNames.map((s) => s.toLowerCase()));
      staticProducts = staticProducts.filter((p) => {
        const segments = p.name.split('|');
        const sz = (p.sizeInfo?.trim() ?? segments[1]?.trim() ?? '').toLowerCase();
        return sz.length > 0 && sizeSet.has(sz);
      });
    }

    if (loreNames.length > 0) {
      const loreSet = new Set(loreNames.map((l) => l.toLowerCase()));
      staticProducts = staticProducts.filter((p) => {
        const segments = p.name.split('|');
        const lr = (p.lore?.trim() ?? segments[4]?.trim() ?? '').toLowerCase();
        return lr.length > 0 && loreSet.has(lr);
      });
    }

    if (search !== undefined) {
      const q = search.toLowerCase();
      staticProducts = staticProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (ids.length > 0) {
      const requested = new Set(ids);
      staticProducts = staticProducts.filter((p) => requested.has(p.id));
    }

    if (priceMin !== undefined) staticProducts = staticProducts.filter((p) => p.price >= priceMin);
    if (priceMax !== undefined) staticProducts = staticProducts.filter((p) => p.price < priceMax);

    if (sort === 'price-asc') staticProducts = [...staticProducts].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') staticProducts = [...staticProducts].sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc') staticProducts = [...staticProducts].sort((a, b) => (a.shortName ?? a.name).localeCompare(b.shortName ?? b.name));
    else if (sort === 'name-desc') staticProducts = [...staticProducts].sort((a, b) => (b.shortName ?? b.name).localeCompare(a.shortName ?? a.name));
    else if (sort === 'category') staticProducts = [...staticProducts].sort((a, b) => a.category.localeCompare(b.category));

    return NextResponse.json({
      products: staticProducts.slice(skip, skip + limit),
      total: staticProducts.length,
      source: 'static',
    });
  }

  return NextResponse.json({ products, total, source: 'mentios' });
}
