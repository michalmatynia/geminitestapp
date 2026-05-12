import { type NextRequest, NextResponse } from 'next/server';
import { getEcomAuthDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { ensureAppIndexes } from '@/lib/db-indexes';
import type { WishlistItem } from '@/context/WishlistContext';

const MAX_WISHLIST_ITEMS = 200;

// eslint-disable-next-line complexity
function sanitizeItem(raw: unknown): WishlistItem | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const productId = typeof item['productId'] === 'string' ? item['productId'].trim() : '';
  const slug = typeof item['slug'] === 'string' ? item['slug'].trim() : '';
  const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
  if (productId.length === 0 || slug.length === 0 || name.length === 0) return null;
  const wishlistItem: WishlistItem = {
    productId,
    slug,
    name,
    category: typeof item['category'] === 'string' ? item['category'].trim() : '',
    price: typeof item['price'] === 'number' && item['price'] >= 0 ? item['price'] : 0,
    priceDisplay: typeof item['priceDisplay'] === 'string' ? item['priceDisplay'].trim() : '',
    gradient: typeof item['gradient'] === 'string' ? item['gradient'].trim() : '',
    imageUrl: typeof item['imageUrl'] === 'string' ? item['imageUrl'].trim() : undefined,
  };
  return wishlistItem;
}

// GET — return the logged-in user's saved wishlist
export async function GET(): Promise<NextResponse> {
  void ensureAppIndexes();
  const user = await getSession();
  if (!user) return NextResponse.json({ items: [] });

  const db = await getEcomAuthDb();
  const doc = await db.collection('ecom_wishlists').findOne({ userId: user.id });
  const items = Array.isArray(doc?.items) ? doc.items : [];
  return NextResponse.json({ items });
}

// POST — replace the wishlist for the logged-in user
// eslint-disable-next-line complexity
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('items' in body)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  const rawItems = (body as Record<string, unknown>)['items'];
  if (!Array.isArray(rawItems)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  if (rawItems.length > MAX_WISHLIST_ITEMS) {
    return NextResponse.json(
      { error: `Wishlist cannot exceed ${MAX_WISHLIST_ITEMS} items` },
      { status: 400 },
    );
  }

  const items: WishlistItem[] = [];
  for (const raw of rawItems) {
    const item = sanitizeItem(raw);
    if (!item) return NextResponse.json({ error: 'Invalid wishlist item' }, { status: 400 });
    items.push(item);
  }

  const db = await getEcomAuthDb();
  await db.collection('ecom_wishlists').updateOne(
    { userId: user.id },
    { $set: { userId: user.id, items, updatedAt: new Date() } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
