import { type NextRequest, NextResponse } from 'next/server';
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
import { getCanonicalProductPricing, type CanonicalProductPricing } from '@/lib/mentios';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';
import { computeDiscount } from '@/lib/promo';
import { fulfillInpostOrder } from '@/lib/inpost';
import { getCheckoutContent } from '@/lib/cms';
import { resolveCheckoutShippingSelection } from '@/lib/shipping';

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
  if (text.length === 0) return undefined;
  return text;
}

function normalizeCurrencyCode(value: unknown): string | undefined {
  const text = readString(value).toUpperCase();
  if (text.length === 0) return undefined;
  return text;
}

function normalizePromoCode(value: unknown): string | undefined {
  const text = readString(value);
  if (text.length === 0) return undefined;
  return text.toUpperCase().replace(/\s+/g, '');
}

function readNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function calculateItemsSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function resolveOrderCurrencyCode(items: OrderItem[]): string | null {
  const currencyCodes = new Set<string>();
  for (const item of items) {
    const currencyCode = normalizeCurrencyCode(item.currencyCode);
    if (currencyCode === undefined) continue;
    currencyCodes.add(currencyCode);
    if (currencyCodes.size > 1) return null;
  }
  const [currencyCode = 'PLN'] = Array.from(currencyCodes);
  return currencyCode;
}

const canonicalPriceDisplay = (pricing: CanonicalProductPricing): string =>
  `${pricing.currencyCode} ${pricing.price}`;

const applyCanonicalPricing = (
  item: OrderItem,
  pricing: CanonicalProductPricing
): OrderItem => {
  if (item.price === pricing.price && item.currencyCode === pricing.currencyCode) return item;
  return {
    ...item,
    price: pricing.price,
    priceDisplay: canonicalPriceDisplay(pricing),
    currencyCode: pricing.currencyCode,
  };
};

// eslint-disable-next-line complexity
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
    const quantity =
      typeof item['quantity'] === 'number' && Number.isInteger(item['quantity']) && item['quantity'] > 0
        ? item['quantity']
        : null;

    if (
      productId.length === 0 ||
      slug.length === 0 ||
      name.length === 0 ||
      category.length === 0 ||
      size.length === 0 ||
      price === null ||
      quantity === null
    ) {
      return null;
    }
    const priceDisplay = readString(item['priceDisplay']);
    const currencyCode = normalizeCurrencyCode(item['currencyCode']);

    items.push({
      productId,
      slug,
      name,
      category,
      size,
      price,
      priceDisplay: priceDisplay.length === 0 ? `${currencyCode ?? 'PLN'} ${price}` : priceDisplay,
      currencyCode,
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
    const fieldValue = address[field];
    if (fieldValue.length === 0) return null;
  }

  return address;
}

// eslint-disable-next-line max-lines-per-function, complexity
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
  if (email.length === 0 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const items = sanitizeItems(body['items']);
  if (items === null || items.length === 0) {
    return NextResponse.json({ error: 'Order items are required' }, { status: 400 });
  }

  const shippingAddress = sanitizeAddress(body['shippingAddress']);
  if (shippingAddress?.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'A complete shipping address is required' }, { status: 400 });
  }

  const customShippingMethod = readString(body['shippingMethod']);
  const shippingMethod = customShippingMethod.length === 0 ? 'Standard' : customShippingMethod;
  const shippingMethodId = readOptionalString(body['shippingMethodId']);
  const shippingCarrier = sanitizeShippingCarrier(body['shippingCarrier']);
  const shippingService = readOptionalString(body['shippingService']);
  const inpostPoint = sanitizeInpostPoint(body['inpostPoint']);
  const shippingPrice = readNonNegativeNumber(body['shippingPrice']);
  const subtotal = readNonNegativeNumber(body['subtotal']);
  const total = readNonNegativeNumber(body['total']);

  if (shippingPrice === null || subtotal === null || total === null || total < 1) {
    return NextResponse.json({ error: 'Valid order totals are required' }, { status: 400 });
  }

  const pricingByProductId = await (async () => {
    try {
      return await getCanonicalProductPricing(items.map((item) => item.productId));
    } catch {
      return null;
    }
  })();
  if (pricingByProductId === null) {
    return NextResponse.json(
      { error: 'Unable to validate item prices at this time.' },
      { status: 503 },
    );
  }

  const pricedItems: OrderItem[] = [];
  for (const item of items) {
    const canonicalPricing = pricingByProductId.get(item.productId);
    if (canonicalPricing === undefined) {
      return NextResponse.json({ error: 'Order items are invalid.' }, { status: 400 });
    }
    pricedItems.push(applyCanonicalPricing(item, canonicalPricing));
  }

  const itemsSubtotal = calculateItemsSubtotal(pricedItems);
  if (itemsSubtotal !== subtotal) {
    return NextResponse.json({ error: 'Order totals are invalid.' }, { status: 400 });
  }
  if (resolveOrderCurrencyCode(pricedItems) === null) {
    return NextResponse.json({ error: 'Order item currencies are invalid.' }, { status: 400 });
  }

  const checkoutContent = await getCheckoutContent('en');
  const shippingSelectionResult = resolveCheckoutShippingSelection({
    content: checkoutContent,
    country: shippingAddress.country,
    subtotal: itemsSubtotal,
    methodId: shippingMethodId,
    methodLabel: shippingMethod,
    service: shippingService,
    carrier: shippingCarrier,
    price: shippingPrice,
    inpostPoint,
  });
  if (!shippingSelectionResult.ok) {
    return NextResponse.json({ error: shippingSelectionResult.error }, { status: 400 });
  }
  const shippingSelection = shippingSelectionResult.selection;

  // Recompute discount server-side from the canonical subtotal and promo code.
  const promoCode = normalizePromoCode(body['promoCode']);
  const discount = await computeDiscount(itemsSubtotal, promoCode, email);

  const expectedTotal = itemsSubtotal - discount + shippingSelection.shippingPrice;
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
    shippingMethod: shippingSelection.shippingMethod,
    shippingPrice: shippingSelection.shippingPrice,
    shippingCarrier: shippingSelection.shippingCarrier,
    shippingService: shippingSelection.shippingService,
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
  } catch {
    // Ignore fulfillment failures during order creation.
  }

  void sendOrderConfirmation(savedOrder).catch(() => undefined);

  return NextResponse.json(
    { orderId: order.orderId, _id: result.insertedId.toString() },
    { status: 201 },
  );
}
