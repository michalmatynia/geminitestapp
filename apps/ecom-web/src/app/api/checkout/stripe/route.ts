import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { createStripePaymentIntent } from '@/lib/stripe';
import { readPaymentProviderAvailability } from '@/lib/providerSettings';
import { buildValidatedCheckoutOrder, isRecord, toMinorCurrencyUnit } from '@/lib/checkout-order';

function buildOrderPayload(result: any, pricedItems: any, now: string): Omit<Order, '_id'> {
  const {
    orderId, userId, email,
    shippingSelection, shippingAddress, inpostPoint,
    subtotal, discount, promoCode, total,
  } = result.order;

  return {
    orderId,
    ...(userId !== undefined ? { userId } : {}),
    email,
    status: 'pending_payment',
    paymentMethod: 'stripe',
    items: pricedItems,
    shippingMethod: shippingSelection.shippingMethod,
    shippingPrice: shippingSelection.shippingPrice,
    shippingCarrier: shippingSelection.shippingCarrier,
    shippingService: shippingSelection.shippingService,
    ...(inpostPoint !== null ? { inpostPoint } : {}),
    shippingAddress,
    subtotal,
    discount,
    promoCode,
    total,
    createdAt: now,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void ensureAppIndexes();
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`stripe:${ip}`, 10, 60 * 60 * 1000);
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

  const paymentAvailability = await readPaymentProviderAvailability();
  if (paymentAvailability.stripe === false) {
    return NextResponse.json({ error: 'Card payment is temporarily unavailable.' }, { status: 503 });
  }

  const result = await buildValidatedCheckoutOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { pricedItems, currencyCode } = result.order;
  const orderPayload = buildOrderPayload(result, pricedItems, new Date().toISOString());

  const db = await getDb();
  const collection = db.collection<Order>(ORDERS_COLLECTION);
  const insertResult = await collection.insertOne(orderPayload as Order);

  try {
    const stripeResult = await createStripePaymentIntent({
      amount: toMinorCurrencyUnit(orderPayload.total),
      currency: currencyCode,
      description: `Stargater order ${orderPayload.orderId}`,
      metadata: { orderId: orderPayload.orderId, email: orderPayload.email },
      extOrderId: orderPayload.orderId,
    });
    const { paymentIntentId, clientSecret, publishableKey } = stripeResult;
    await collection.updateOne({ orderId: orderPayload.orderId }, { $set: { stripePaymentIntentId: paymentIntentId } }).catch(() => undefined);
    return NextResponse.json(
      { orderId: orderPayload.orderId, clientSecret, publishableKey, _id: insertResult.insertedId.toString() },
      { status: 201 },
    );
  } catch (err: unknown) {
    await collection.updateOne({ orderId: orderPayload.orderId, status: 'pending_payment' }, { $set: { status: 'cancelled' } }).catch(() => undefined);
    const msg = err instanceof Error ? err.message : 'Payment gateway error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
