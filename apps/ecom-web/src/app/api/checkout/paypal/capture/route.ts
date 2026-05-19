import { type NextRequest, NextResponse } from 'next/server';
import { type Collection, type WithId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { type Order, ORDERS_COLLECTION, serializeOrder } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { capturePayPalOrder } from '@/lib/paypal';
import { sendOrderConfirmation } from '@/lib/email';
import { fulfillInpostOrder } from '@/lib/inpost';

const ORDER_ID_RE = /^ARC-\d{4}-[0-9A-F]{8}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function handleFulfillment(collection: Collection<Order>, order: WithId<Order>): Promise<void> {
  const emailClaim = await collection.updateOne(
    { _id: order._id, confirmationEmailQueuedAt: { $exists: false } },
    { $set: { confirmationEmailQueuedAt: new Date().toISOString() } } as any,
  ).catch(() => ({ modifiedCount: 0 }));
  
  if (emailClaim.modifiedCount > 0) {
    await sendOrderConfirmation(serializeOrder(order)).catch(() => undefined);
    await fulfillInpostOrder(serializeOrder(order)).catch(() => undefined);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`paypal-capture:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const orderId = readString(body['orderId']).toUpperCase();
  const paypalOrderId = readString(body['paypalOrderId']);

  if (!ORDER_ID_RE.test(orderId) || paypalOrderId.length === 0) {
    return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection<Order>(ORDERS_COLLECTION);

  const existing = await collection.findOne(
    { orderId, paymentMethod: 'paypal' },
    { projection: { status: 1, paypalOrderId: 1 } },
  );

  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (existing.status !== 'pending_payment') {
    return NextResponse.json({ orderId, status: existing.status }, { status: 200 });
  }

  try {
    const captureResult = await capturePayPalOrder(paypalOrderId);
    if (captureResult.status !== 'COMPLETED') {
      await collection.updateOne(
        { orderId, status: 'pending_payment' },
        { $set: { status: 'cancelled' } },
      ).catch(() => undefined);
      return NextResponse.json({ error: 'PayPal payment was declined.' }, { status: 422 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PayPal capture failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const updated = await collection.findOneAndUpdate(
    { orderId },
    { $set: { status: 'processing' } },
    { returnDocument: 'after' },
  ).catch(() => null);

  if (updated !== null && updated !== undefined) {
    await handleFulfillment(collection, updated);
  }

  return NextResponse.json({ orderId, status: 'processing' }, { status: 200 });
}
