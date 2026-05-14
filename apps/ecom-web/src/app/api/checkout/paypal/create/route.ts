import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { createPayPalOrder } from '@/lib/paypal';
import { readPaymentProviderAvailability } from '@/lib/providerSettings';
import { buildValidatedCheckoutOrder, isRecord, toMinorCurrencyUnit } from '@/lib/checkout-order';

// eslint-disable-next-line max-lines-per-function, complexity
export async function POST(req: NextRequest): Promise<NextResponse> {
  void ensureAppIndexes();
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`paypal-create:${ip}`, 10, 60 * 60 * 1000);
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
  if (paymentAvailability.paypal === false) {
    return NextResponse.json({ error: 'PayPal payment is temporarily unavailable.' }, { status: 503 });
  }

  const result = await buildValidatedCheckoutOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const {
    orderId, userId, email, pricedItems,
    shippingSelection, shippingAddress, inpostPoint,
    subtotal, discount, promoCode, total, currencyCode, baseUrl,
  } = result.order;

  const now = new Date().toISOString();
  const order: Omit<Order, '_id'> = {
    orderId,
    ...(userId !== undefined ? { userId } : {}),
    email,
    status: 'pending_payment',
    paymentMethod: 'paypal',
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

  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);
  const insertResult = await collection.insertOne(order);

  let paypalOrderId: string;
  try {
    const paypalResult = await createPayPalOrder({
      amount: toMinorCurrencyUnit(total),
      currency: currencyCode,
      description: `Stargater order ${orderId}`,
      extOrderId: orderId,
      returnUrl: `${baseUrl}/checkout?paypal_return=1&orderId=${encodeURIComponent(orderId)}`,
      cancelUrl: `${baseUrl}/checkout`,
      items: pricedItems.map((item) => ({
        name: `${item.name} (${item.size})`,
        unit_amount: {
          currency_code: currencyCode,
          value: item.price.toFixed(2),
        },
        quantity: String(item.quantity),
      })),
    });
    paypalOrderId = paypalResult.paypalOrderId;
  } catch (err: unknown) {
    await collection.updateOne(
      { orderId, status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    ).catch(() => undefined);
    const msg = err instanceof Error ? err.message : 'PayPal payment gateway error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  await collection.updateOne(
    { orderId },
    { $set: { paypalOrderId } },
  ).catch(() => undefined);

  return NextResponse.json(
    { orderId, paypalOrderId, _id: insertResult.insertedId.toString() },
    { status: 201 },
  );
}
