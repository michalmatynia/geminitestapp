import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { capturePayPalOrder } from '@/lib/paypal';
import { sendOrderConfirmation } from '@/lib/email';
import { fulfillInpostOrder } from '@/lib/inpost';
import { serializeOrder } from '@/lib/orders';

const ORDER_ID_RE = /^ARC-\d{4}-[0-9A-F]{8}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

  if (!ORDER_ID_RE.test(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }
  if (paypalOrderId.length === 0) {
    return NextResponse.json({ error: 'Invalid PayPal order ID' }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);

  const existing = await collection.findOne(
    { orderId, paymentMethod: 'paypal' },
    { projection: { status: 1, paypalOrderId: 1 } },
  );

  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (existing['status'] !== 'pending_payment') {
    // Already processed (idempotent)
    return NextResponse.json({ orderId, status: existing['status'] }, { status: 200 });
  }

  let captureStatus: string;
  try {
    const captureResult = await capturePayPalOrder(paypalOrderId);
    captureStatus = captureResult.status;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PayPal capture failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (captureStatus !== 'COMPLETED') {
    await collection.updateOne(
      { orderId, status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    ).catch(() => undefined);
    return NextResponse.json({ error: 'PayPal payment was declined.' }, { status: 422 });
  }

  await collection.updateOne(
    { orderId },
    { $set: { status: 'processing' } },
  ).catch(() => undefined);

  const order = await collection.findOne({ orderId });
  if (order !== null) {
    await sendOrderConfirmation(serializeOrder(order)).catch(() => undefined);
    await fulfillInpostOrder(serializeOrder(order)).catch(() => undefined);
  }

  return NextResponse.json({ orderId, status: 'processing' }, { status: 200 });
}
