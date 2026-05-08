import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`order-status:${ip}`, 120, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const { orderId } = await params;
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const db = await getDb();
  const order = await db
    .collection(ORDERS_COLLECTION)
    .findOne({ orderId }, { projection: { status: 1 } });

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ status: order['status'] as string });
}
