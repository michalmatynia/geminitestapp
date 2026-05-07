import { NextResponse, type NextRequest } from 'next/server';
import { getMentiosProducts } from '@/lib/mentios';
import { PRODUCTS } from '@/data/products';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const collectionSlug = searchParams.get('collection') ?? undefined;
  const search = searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const ids = searchParams.get('ids')?.split(',').map((s) => s.trim()).filter(Boolean);
  const newOnly = searchParams.get('new') === '1';

  const { products, total } = await getMentiosProducts({ limit, skip, collectionSlug, search, ids, newOnly });

  // Fall back to static demo products when DB is not configured or empty.
  if (products.length === 0) {
    let staticProducts = collectionSlug
      ? PRODUCTS.filter((p) => p.collectionSlug === collectionSlug)
      : PRODUCTS;

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

    return NextResponse.json({
      products: staticProducts.slice(skip, skip + limit),
      total: staticProducts.length,
      source: 'static',
    });
  }

  return NextResponse.json({ products, total, source: 'mentios' });
}
