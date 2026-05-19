import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { createPayUBlikOrder } from '@/lib/payu';
import { readPaymentProviderAvailability } from '@/lib/providerSettings';
import { buildValidatedCheckoutOrder, isRecord, readString, toMinorCurrencyUnit, type BuildCheckoutOrderResult } from '@/lib/checkout-order';
import type { OrderItem } from '@/lib/orders';

const BLIK_RE = /^\d{6}$/;

function buildOrderPayload(result: Extract<BuildCheckoutOrderResult, { ok: true }>, pricedItems: OrderItem[], now: string): Omit<Order, '_id'> {
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
    paymentMethod: 'blik',
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
  const { allowed, retryAfterSec } = checkRateLimit(`blik:${ip}`, 10, 60 * 60 * 1000);
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

  const blikCode = readString(body['blikCode']);
  if (blikCode.length !== 6 || !BLIK_RE.test(blikCode)) {
    return NextResponse.json({ error: 'Enter a valid 6-digit BLIK code.' }, { status: 400 });
  }

  const paymentAvailability = await readPaymentProviderAvailability();
  if (paymentAvailability.payu === false) {
    return NextResponse.json({ error: 'BLIK payment is temporarily unavailable.' }, { status: 503 });
  }

  const result = await buildValidatedCheckoutOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { pricedItems, currencyCode, baseUrl } = result.order;
  const orderPayload = buildOrderPayload(result, pricedItems, new Date().toISOString());

  const db = await getDb();
  const collection = db.collection<Order>(ORDERS_COLLECTION);
  const insertResult = await collection.insertOne(orderPayload as Order);

  try {
    const payuResult = await createPayUBlikOrder({
      notifyUrl: `${baseUrl}/api/webhooks/payu`,
      customerIp: ip,
      description: `Stargater order ${orderPayload.orderId}`,
      currencyCode,
      totalAmount: toMinorCurrencyUnit(orderPayload.total),
      extOrderId: orderPayload.orderId,
      buyer: {
        email: orderPayload.email,
        firstName: orderPayload.shippingAddress.firstName,
        lastName: orderPayload.shippingAddress.lastName,
        phone: orderPayload.shippingAddress.phone,
        language: 'pl',
      },
      products: pricedItems.map((item: OrderItem) => ({
        name: `${item.name} (${item.size})`,
        unitPrice: toMinorCurrencyUnit(item.price),
        quantity: item.quantity,
      })),
      blikCode,
    });
    const payuOrderId = payuResult.payuOrderId;
    await collection.updateOne({ orderId: orderPayload.orderId }, { $set: { payuOrderId } }).catch(() => undefined);
    return NextResponse.json(
      { orderId: orderPayload.orderId, payuOrderId, _id: insertResult.insertedId.toString() },
      { status: 201 },
    );
  } catch (err: unknown) {
    await collection.updateOne({ orderId: orderPayload.orderId, status: 'pending_payment' }, { $set: { status: 'cancelled' } }).catch(() => undefined);
    const msg = err instanceof Error ? err.message : 'BLIK payment failed';
    const isBadCode = msg.includes('BLIK') || msg.includes('authorization') || msg.includes('ERROR_VALUE_INVALID');
    return NextResponse.json(
      { error: isBadCode ? 'Invalid BLIK code. Please check and try again.' : 'Payment gateway error. Please try again.' },
      { status: isBadCode ? 422 : 502 },
    );
  }
}
