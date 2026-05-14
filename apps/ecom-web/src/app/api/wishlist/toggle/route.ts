/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from 'next/server';
import { getEcomAuthDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import type { WishlistItem } from '@/context/WishlistContext';

function sanitizeItem(raw: unknown): WishlistItem | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const productId = typeof item['productId'] === 'string' ? item['productId'].trim() : '';
  const slug = typeof item['slug'] === 'string' ? item['slug'].trim() : '';
  const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
  if (!productId || !slug || !name) return null;
  return {
    productId,
    slug,
    name,
    category: typeof item['category'] === 'string' ? item['category'].trim() : '',
    price: typeof item['price'] === 'number' && item['price'] >= 0 ? item['price'] : 0,
    priceDisplay: typeof item['priceDisplay'] === 'string' ? item['priceDisplay'].trim() : '',
    currencyCode: typeof item['currencyCode'] === 'string' ? item['currencyCode'].trim().toUpperCase() : undefined,
    gradient: typeof item['gradient'] === 'string' ? item['gradient'].trim() : '',
    imageUrl: typeof item['imageUrl'] === 'string' ? item['imageUrl'].trim() : undefined,
  };
}

// POST — atomically toggle one product in/out of the user's wishlist and update global count
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const item = sanitizeItem(body);
  if (!item) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
  const { productId } = item;

  const db = await getEcomAuthDb();

  // Check current wishlist state for this user
  const doc = await db.collection('ecom_wishlists').findOne({ userId: user.id });
  const currentItems: any[] = Array.isArray(doc?.items) ? doc.items : [];
  const wasWishlisted = currentItems.some((i: any) => i.productId === productId);

  if (wasWishlisted) {
    await db.collection('ecom_wishlists').updateOne(
      { userId: user.id },
      { $pull: { items: { productId } } as any, $set: { updatedAt: new Date() } },
      { upsert: true },
    );
    // Decrement count, never below 0
    await db.collection('ecom_wishlist_counts').updateOne(
      { productId },
      [{ $set: { count: { $max: [0, { $subtract: [{ $ifNull: ['$count', 0] }, 1] }] } } }],
      { upsert: true },
    );
  } else {
    await db.collection('ecom_wishlists').updateOne(
      { userId: user.id },
      { $push: { items: item } as any, $set: { updatedAt: new Date() } },
      { upsert: true },
    );
    await db.collection('ecom_wishlist_counts').updateOne(
      { productId },
      { $inc: { count: 1 } },
      { upsert: true },
    );
  }

  const countDoc = await db.collection('ecom_wishlist_counts').findOne({ productId });
  const count: number = (countDoc?.count as number | undefined) ?? (wasWishlisted ? 0 : 1);

  return NextResponse.json({ wishlisted: !wasWishlisted, count });
}
