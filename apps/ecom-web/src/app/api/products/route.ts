import { NextResponse, type NextRequest } from 'next/server';
import { getMentiosProducts } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';
import { normalizeLocale } from '@/lib/locales';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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
  const categoryNames = [
    ...parseFilterList(searchParams, 'categories'),
    ...(categoryName ? [categoryName] : []),
  ];
  const themeNames = parseFilterList(searchParams, 'themes');
  const search = searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const ids = searchParams.get('ids')?.split(',').map((s) => s.trim()).filter(Boolean);
  const newOnly = searchParams.get('new') === '1';
  const locale = normalizeLocale(searchParams.get('locale') ?? req.headers.get('x-ecom-locale'));
  const sort = searchParams.get('sort') ?? undefined;
  const priceMinRaw = searchParams.get('priceMin');
  const priceMaxRaw = searchParams.get('priceMax');
  const priceMin = priceMinRaw != null ? parseFloat(priceMinRaw) : undefined;
  const priceMax = priceMaxRaw != null ? parseFloat(priceMaxRaw) : undefined;

  const { products, total } = await getMentiosProducts({
    limit, skip, collectionSlug, categoryName, categoryNames, themeNames, search, ids, newOnly, locale, sort, priceMin, priceMax,
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
