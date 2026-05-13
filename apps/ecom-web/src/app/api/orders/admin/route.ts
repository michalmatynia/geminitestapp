import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, serializeOrder, type ShippingCarrier } from '@/lib/orders';

const ORDER_FILTER_CARRIERS = new Set<ShippingCarrier>(['manual', 'inpost', 'poczta_polska', 'dpd']);

function readLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return 25;
  return Math.min(100, Math.max(1, parsed));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  void ensureAppIndexes();

  const limit = readLimit(req.nextUrl.searchParams.get('limit'));
  const carrier = req.nextUrl.searchParams.get('carrier')?.trim();
  const filter = ORDER_FILTER_CARRIERS.has(carrier as ShippingCarrier)
    ? { shippingCarrier: carrier as ShippingCarrier }
    : {};

  const db = await getDb();
  const docs = await db
    .collection(ORDERS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const total = await db.collection(ORDERS_COLLECTION).countDocuments(filter);

  return NextResponse.json({
    orders: docs.map(serializeOrder),
    total,
  });
}
