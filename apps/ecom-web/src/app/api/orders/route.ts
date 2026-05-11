import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendOrderConfirmation } from '@/lib/email';
import { getDb } from '@/lib/mongodb';
import {
  generateOrderId,
  ORDERS_COLLECTION,
  sanitizeInpostPoint,
  sanitizeShippingCarrier,
  type Order,
  type OrderItem,
} from '@/lib/orders';
import { getCanonicalProductPrices } from '@/lib/mentios';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { computeDiscount } from '@/lib/promo';
import { fulfillInpostOrder } from '@/lib/inpost';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_ADDRESS_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'address',
  'city',
  'postcode',
  'country',
  'phone',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown): string | undefined {
  const text = readString(value);
  return text ? text : undefined;
}

function readNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function calculateItemsSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function sanitizeItems(value: unknown): OrderItem[] | null {
  if (!Array.isArray(value)) return null;

  const items: OrderItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;

    const productId = readString(item['productId']);
    const slug = readString(item['slug']);
    const name = readString(item['name']);
    const category = readString(item['category']);
    const size = readString(item['size']);
    const price = readNonNegativeNumber(item['price']);
    const quantity = typeof item['quantity'] === 'number' && Number.isInteger(item['quantity'])
      ? item['quantity']
      : null;

    if (!productId || !slug || !name || !category || !size || price == null || !quantity || quantity < 1) {
      return null;
    }

    items.push({
      productId,
      slug,
      name,
      category,
      size,
      price,
      priceDisplay: readString(item['priceDisplay']) || `EUR ${price}`,
      quantity,
      imageUrl: readOptionalString(item['imageUrl']),
    });
  }

  return items;
}

function sanitizeAddress(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;

  const address: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') address[key] = raw.trim();
  }

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!address[field]) return null;
  }

  return address;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void ensureAppIndexes();
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`orders:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many orders from this address. Please try again later.' },
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
    return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
  }

  const email = readString(body['email']).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const items = sanitizeItems(body['items']);
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Order items are required' }, { status: 400 });
  }

  const shippingAddress = sanitizeAddress(body['shippingAddress']);
  if (!shippingAddress || shippingAddress.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'A complete shipping address is required' }, { status: 400 });
  }

  const shippingMethod = readString(body['shippingMethod']) || 'Standard';
  const shippingCarrier = sanitizeShippingCarrier(body['shippingCarrier']);
  const shippingService = readOptionalString(body['shippingService']);
  const inpostPoint = sanitizeInpostPoint(body['inpostPoint']);
  const shippingPrice = readNonNegativeNumber(body['shippingPrice']);
  const subtotal = readNonNegativeNumber(body['subtotal']);
  const total = readNonNegativeNumber(body['total']);

  if (shippingCarrier === 'inpost' && !inpostPoint) {
    return NextResponse.json({ error: 'An InPost pickup point is required' }, { status: 400 });
  }
  if (shippingCarrier === 'inpost' && shippingAddress.country !== 'Poland') {
    return NextResponse.json({ error: 'InPost parcel locker delivery is available only in Poland' }, { status: 400 });
  }

  if (shippingPrice == null || subtotal == null || total == null || total < 1) {
    return NextResponse.json({ error: 'Valid order totals are required' }, { status: 400 });
  }

  let pricedItems: OrderItem[];
  let priceByProductId: Map<string, number>;
  try {
    priceByProductId = await getCanonicalProductPrices(items.map((item) => item.productId));
  } catch {
    return NextResponse.json(
      { error: 'Unable to validate item prices at this time.' },
      { status: 503 },
    );
  }

  pricedItems = [];
  for (const item of items) {
    const canonicalPrice = priceByProductId.get(item.productId);
    if (typeof canonicalPrice !== 'number') {
      return NextResponse.json({ error: 'Order items are invalid.' }, { status: 400 });
    }
    pricedItems.push(canonicalPrice === item.price ? item : { ...item, price: canonicalPrice });
  }

  // Recompute discount server-side from the promo code — never trust the client value.
  const promoCode = readOptionalString(body['promoCode']);
  const discount = computeDiscount(subtotal, promoCode);
  const itemsSubtotal = calculateItemsSubtotal(pricedItems);
  if (itemsSubtotal !== subtotal) {
    return NextResponse.json({ error: 'Order totals are invalid.' }, { status: 400 });
  }

  const expectedTotal = itemsSubtotal - discount + shippingPrice;
  if (expectedTotal < 1) {
    return NextResponse.json({ error: 'Order total is invalid.' }, { status: 400 });
  }

  if (total !== expectedTotal) {
    return NextResponse.json({ error: 'Order totals are invalid.' }, { status: 400 });
  }

  const session = await getSession();
  const now = new Date().toISOString();
  const order: Omit<Order, '_id'> = {
    orderId: generateOrderId(),
    ...(session ? { userId: session.id } : {}),
    email,
    status: 'processing',
    items: pricedItems,
    shippingMethod,
    shippingPrice,
    shippingCarrier,
    shippingService,
    ...(inpostPoint ? { inpostPoint } : {}),
    shippingAddress,
    subtotal,
    discount,
    promoCode,
    total,
    createdAt: now,
  };

  const db = await getDb();
  const result = await db.collection(ORDERS_COLLECTION).insertOne(order);
  let savedOrder: Order = { ...order, _id: result.insertedId.toString() };

  try {
    const shipment = await fulfillInpostOrder(savedOrder);
    if (shipment) savedOrder = { ...savedOrder, inpostShipment: shipment };
  } catch (error: unknown) {
    console.error('Failed to create InPost shipment', error);
  }

  void sendOrderConfirmation(savedOrder).catch((error: unknown) => {
    console.error('Failed to send order confirmation email', error);
  });

  return NextResponse.json(
    { orderId: order.orderId, _id: result.insertedId.toString() },
    { status: 201 },
  );
}
