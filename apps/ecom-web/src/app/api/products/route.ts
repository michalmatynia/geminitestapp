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
      if (!normalized || seen.has(normalized)) continue;
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
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 64)
    .slice(0, MAX_IDS);
}

function clampText(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_QUERY_TEXT_LENGTH);
}

function isValidSort(value: string | null | undefined): boolean {
  if (!value) return true;
  return value === 'featured' || value === 'price-asc' || value === 'price-desc' || value === 'newest';
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

export async function GET(req: NextRequest) {
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
  if (rawCollectionSlug && rawCollectionSlug.length > MAX_QUERY_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Invalid collection filter' }, { status: 400 });
  }
  if (rawCategoryName && rawCategoryName.length > MAX_QUERY_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Invalid category filter' }, { status: 400 });
  }

  const categoryNames = [
    ...parseFilterList(searchParams, 'categories'),
    ...(rawCategoryName ? [rawCategoryName] : []),
  ];
  const themeNames = parseFilterList(searchParams, 'themes');
  const search = searchParams.get('q') ?? undefined;
  const limit = parseLimit(searchParams.get('limit'), 100, 200);
  const skip = parseSkip(searchParams.get('skip'));
  const ids = sanitizeIds(searchParams.get('ids'));
  const newOnly = searchParams.get('new') === '1';
  const locale = normalizeLocale(clampText(searchParams.get('locale') ?? req.headers.get('x-ecom-locale')) ?? null);
  const sort = clampText(searchParams.get('sort')) ?? undefined;
  const priceMinRaw = clampText(searchParams.get('priceMin'));
  const priceMaxRaw = clampText(searchParams.get('priceMax'));
  const priceMin = priceMinRaw != null ? Number(priceMinRaw) : undefined;
  const priceMax = priceMaxRaw != null ? Number(priceMaxRaw) : undefined;

  const safeCategoryName = clampText(rawCategoryName);
  const safeCollectionSlug = clampText(rawCollectionSlug);

  if (search && search.length > MAX_QUERY_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Search query is too long' }, { status: 400 });
  }
  if (!isValidSort(sort)) {
    return NextResponse.json({ error: 'Invalid sort' }, { status: 400 });
  }
  if (themeNames.length > MAX_CATALOG_FILTER_ITEMS || categoryNames.length > MAX_CATALOG_FILTER_ITEMS) {
    return NextResponse.json({ error: 'Too many filter values' }, { status: 400 });
  }
  for (const value of [...themeNames, ...categoryNames]) {
    if (value.length > MAX_QUERY_TEXT_LENGTH) {
      return NextResponse.json({ error: 'Invalid filter value length' }, { status: 400 });
    }
  }
  if ((priceMin != null && (!Number.isFinite(priceMin) || priceMin < 0)) ||
      (priceMax != null && (!Number.isFinite(priceMax) || priceMax < 0))) {
    return NextResponse.json({ error: 'Invalid price filters' }, { status: 400 });
  }
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    return NextResponse.json({ error: 'Invalid price range' }, { status: 400 });
  }

  const { products, total } = await getMentiosProducts({
    limit,
    skip,
    collectionSlug: safeCollectionSlug,
    categoryName: safeCategoryName,
    categoryNames,
    themeNames,
    search: search ? search.slice(0, MAX_QUERY_TEXT_LENGTH) : undefined,
    ids,
    newOnly,
    locale,
    sort,
    priceMin,
    priceMax,
  });

  // Fall back to static demo products when DB is not configured or empty.
  if (products.length === 0) {
    let staticProducts = (collectionSlug
      ? PRODUCTS.filter((p) => p.collectionSlug === collectionSlug)
      : PRODUCTS
    ).filter((p) => !p.isSoldOut);

    if (categoryNames.length > 0) {
      const selected = new Set(categoryNames);
      staticProducts = staticProducts.filter((p) => selected.has(p.category));
    }

    if (themeNames.length > 0) {
      staticProducts = staticProducts.filter((p) => productMatchesThemes(p, themeNames));
    }

    if (search) {
      const q = search.toLowerCase();
      staticProducts = staticProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (ids && ids.length > 0) {
      const requested = new Set(ids);
      staticProducts = staticProducts.filter((p) => requested.has(p.id));
    }

    if (priceMin != null) staticProducts = staticProducts.filter((p) => p.price >= priceMin);
    if (priceMax != null) staticProducts = staticProducts.filter((p) => p.price < priceMax);

    if (sort === 'price-asc') staticProducts = [...staticProducts].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') staticProducts = [...staticProducts].sort((a, b) => b.price - a.price);

    return NextResponse.json({
      products: staticProducts.slice(skip, skip + limit),
      total: staticProducts.length,
      source: 'static',
    });
  }

  return NextResponse.json({ products, total, source: 'mentios' });
}
