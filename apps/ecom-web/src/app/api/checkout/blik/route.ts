/* eslint-disable max-lines */

import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
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
import { createPayUBlikOrder } from '@/lib/payu';
import { getCheckoutContent } from '@/lib/cms';
import { resolveCheckoutShippingSelection } from '@/lib/shipping';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLIK_RE = /^\d{6}$/;
const REQUIRED_ADDRESS_FIELDS = ['email', 'firstName', 'lastName', 'address', 'city', 'postcode', 'country', 'phone'];
const WEBHOOK_BASE_URL_CANDIDATES = ['NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_ECOM_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'];

function getWebhookCallbackBaseUrl(): string | null {
  for (const envName of WEBHOOK_BASE_URL_CANDIDATES) {
    const raw = process.env[envName];
    if (typeof raw !== 'string' || raw.trim().length === 0) continue;

    const normalized = raw.trim();
    const candidate = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;

    try {
      const url = new URL(candidate);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      return url.origin;
    } catch {
      continue;
    }
  }

  return null;
}

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

function canonicalPriceDisplay(pricing: CanonicalProductPricing): string {
  return `${pricing.currencyCode} ${pricing.price}`;
}

const applyCanonicalPricing = (
  item: OrderItem,
  pricing: CanonicalProductPricing
): OrderItem =>
  item.price === pricing.price && item.currencyCode === pricing.currencyCode
    ? item
    : { ...item, price: pricing.price, priceDisplay: canonicalPriceDisplay(pricing), currencyCode: pricing.currencyCode };

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

function sanitizeAddress(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const address: Partial<Record<string, string>> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') address[key] = raw.trim();
  }
  for (const field of REQUIRED_ADDRESS_FIELDS) {
    const fieldValue = address[field];
    if (typeof fieldValue !== 'string' || fieldValue.length === 0) return null;
  }
  return address as Record<string, string>;
}

// eslint-disable-next-line max-lines-per-function, complexity
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
  if (blikCode.length !== 6) {
    return NextResponse.json({ error: 'Enter a valid 6-digit BLIK code.' }, { status: 400 });
  }
  if (!BLIK_RE.test(blikCode)) {
    return NextResponse.json({ error: 'Enter a valid 6-digit BLIK code.' }, { status: 400 });
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

  let pricingByProductId: Map<string, CanonicalProductPricing>;
  try {
    pricingByProductId = await getCanonicalProductPricing(items.map((item) => item.productId));
  } catch {
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
  const orderCurrencyCode = resolveOrderCurrencyCode(pricedItems);
  if (orderCurrencyCode === null) {
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
  const orderId = generateOrderId();
  const now = new Date().toISOString();
  const baseUrl = getWebhookCallbackBaseUrl();
  if (baseUrl === null) {
    return NextResponse.json(
      { error: 'Payment callback URL is not configured. Set NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_ECOM_URL.' },
      { status: 500 },
    );
  }

  const notifyUrl = `${baseUrl}/api/webhooks/payu`;
  const order: Omit<Order, '_id'> = {
    orderId,
    ...(session ? { userId: session.id } : {}),
    email,
    status: 'pending_payment',
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
  const collection = db.collection(ORDERS_COLLECTION);
  const result = await collection.insertOne(order);

  let payuOrderId: string;
  try {
    const payuResult = await createPayUBlikOrder({
      notifyUrl,
      customerIp: ip,
      description: `Stargater order ${orderId}`,
      currencyCode: orderCurrencyCode,
      totalAmount: total,
      extOrderId: orderId,
      buyer: {
        email,
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone,
        language: 'pl',
      },
      products: pricedItems.map((item) => ({
        name: `${item.name} (${item.size})`,
        unitPrice: item.price,
        quantity: item.quantity,
      })),
      blikCode,
    });
    payuOrderId = payuResult.payuOrderId;
  } catch (err: unknown) {
    await collection.updateOne(
      { orderId, status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    ).catch(() => undefined);
    const msg = err instanceof Error ? err.message : 'BLIK payment failed';
    const isBadCode = msg.includes('BLIK') || msg.includes('authorization') || msg.includes('ERROR_VALUE_INVALID');
    return NextResponse.json(
      { error: isBadCode ? 'Invalid BLIK code. Please check and try again.' : 'Payment gateway error. Please try again.' },
      { status: isBadCode ? 422 : 502 },
    );
  }

  await collection.updateOne(
    { orderId },
    { $set: { payuOrderId } },
  ).catch(() => undefined);

  return NextResponse.json(
    { orderId: order.orderId, payuOrderId, _id: result.insertedId.toString() },
    { status: 201 },
  );
}
