import { NextRequest, NextResponse } from 'next/server';
import { getEcomAuthDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import type { WishlistItem } from '@/context/WishlistContext';

// GET — return the logged-in user's saved wishlist
export async function GET(): Promise<NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ items: [] });

  const db = await getEcomAuthDb();
  const doc = await db.collection('ecom_wishlists').findOne({ userId: user.id });
  return NextResponse.json({ items: (doc?.items as WishlistItem[]) ?? [] });
}

// POST — replace the wishlist for the logged-in user
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { items } = body as { items?: WishlistItem[] };
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  const db = await getEcomAuthDb();
  await db.collection('ecom_wishlists').updateOne(
    { userId: user.id },
    { $set: { userId: user.id, items, updatedAt: new Date() } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
