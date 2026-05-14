import 'server-only';

import { getSession } from '@/lib/auth';
import { formatPrice } from '@/lib/locales';
import { getCanonicalProductPricing, type CanonicalProductPricing } from '@/lib/mentios';
import { computeDiscount } from '@/lib/promo';
import { getCheckoutContent } from '@/lib/cms';
import { resolveCheckoutShippingSelection, type CheckoutShippingSelection } from '@/lib/shipping';
import { readShippingProviderAvailability } from '@/lib/providerSettings';
import {
  generateOrderId,
  sanitizeInpostPoint,
  sanitizeShippingCarrier,
  type OrderItem,
  type InpostPoint,
} from '@/lib/orders';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REQUIRED_ADDRESS_FIELDS = ['email', 'firstName', 'lastName', 'address', 'city', 'postcode', 'country'];
const WEBHOOK_BASE_URL_CANDIDATES = ['NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_ECOM_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'];

export function getWebhookCallbackBaseUrl(): string | null {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readOptionalString(value: unknown): string | undefined {
  const text = readString(value);
  return text.length === 0 ? undefined : text;
}

export function normalizeCurrencyCode(value: unknown): string | undefined {
  const text = readString(value).toUpperCase();
  return text.length === 0 ? undefined : text;
}

export function normalizePromoCode(value: unknown): string | undefined {
  const text = readString(value);
  if (text.length === 0) return undefined;
  return text.toUpperCase().replace(/\s+/g, '');
}

export function readNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function roundMoneyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export function readMoneyAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return roundMoneyAmount(value);
}

export function toMinorCurrencyUnit(amount: number): number {
  return Math.round(roundMoneyAmount(amount) * 100);
}

function moneyAmountsEqual(left: number, right: number): boolean {
  return toMinorCurrencyUnit(left) === toMinorCurrencyUnit(right);
}

export function calculateItemsSubtotal(items: OrderItem[]): number {
  return roundMoneyAmount(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

function canonicalPriceDisplay(pricing: CanonicalProductPricing): string {
  return formatPrice(pricing.price, pricing.currencyCode === 'PLN' ? 'pl' : 'en', pricing.currencyCode);
}

export const applyCanonicalPricing = (item: OrderItem, pricing: CanonicalProductPricing): OrderItem =>
  moneyAmountsEqual(item.price, pricing.price) && item.currencyCode === pricing.currencyCode
    ? item
    : { ...item, price: pricing.price, priceDisplay: canonicalPriceDisplay(pricing), currencyCode: pricing.currencyCode };

// eslint-disable-next-line complexity
export function sanitizeItems(value: unknown): OrderItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: OrderItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const productId = readString(item['productId']);
    const slug = readString(item['slug']);
    const name = readString(item['name']);
    const category = readString(item['category']);
    const size = readString(item['size']);
    const price = readMoneyAmount(item['price']);
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

export function resolveOrderCurrencyCode(items: OrderItem[]): string | null {
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

export function sanitizeAddress(value: unknown): Record<string, string> | null {
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

export type ValidatedCheckoutOrder = {
  orderId: string;
  userId: string | undefined;
  email: string;
  pricedItems: OrderItem[];
  inpostPoint: InpostPoint | null;
  shippingAddress: Record<string, string>;
  shippingSelection: CheckoutShippingSelection;
  subtotal: number;
  discount: number;
  promoCode: string | undefined;
  total: number;
  currencyCode: string;
  baseUrl: string;
};

export type BuildCheckoutOrderResult =
  | { ok: true; order: ValidatedCheckoutOrder }
  | { ok: false; error: string; status: number };

// eslint-disable-next-line max-lines-per-function, complexity
export async function buildValidatedCheckoutOrder(
  body: Record<string, unknown>,
): Promise<BuildCheckoutOrderResult> {
  const email = readString(body['email']).toLowerCase();
  if (email.length === 0 || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'A valid email is required', status: 400 };
  }

  const items = sanitizeItems(body['items']);
  if (items === null || items.length === 0) {
    return { ok: false, error: 'Order items are required', status: 400 };
  }

  const shippingAddress = sanitizeAddress(body['shippingAddress']);
  if (shippingAddress?.email.toLowerCase() !== email) {
    return { ok: false, error: 'A complete shipping address is required', status: 400 };
  }

  const customShippingMethod = readString(body['shippingMethod']);
  const shippingMethod = customShippingMethod.length === 0 ? 'Standard' : customShippingMethod;
  const shippingMethodId = readOptionalString(body['shippingMethodId']);
  const shippingCarrier = sanitizeShippingCarrier(body['shippingCarrier']);
  const shippingService = readOptionalString(body['shippingService']);
  const inpostPoint = sanitizeInpostPoint(body['inpostPoint']);
  const shippingPrice = readMoneyAmount(body['shippingPrice']);
  const subtotal = readMoneyAmount(body['subtotal']);
  const total = readMoneyAmount(body['total']);

  if (shippingPrice === null || subtotal === null || total === null || total < 1) {
    return { ok: false, error: 'Valid order totals are required', status: 400 };
  }

  const requestedOrderCurrencyCode = resolveOrderCurrencyCode(items);
  if (requestedOrderCurrencyCode === null) {
    return { ok: false, error: 'Order item currencies are invalid.', status: 400 };
  }

  let pricingByProductId: Map<string, CanonicalProductPricing>;
  try {
    pricingByProductId = await getCanonicalProductPricing(
      items.map((item) => item.productId),
      requestedOrderCurrencyCode,
    );
  } catch {
    return { ok: false, error: 'Unable to validate item prices at this time.', status: 503 };
  }

  const pricedItems: OrderItem[] = [];
  for (const item of items) {
    const canonicalPricing = pricingByProductId.get(item.productId);
    if (canonicalPricing === undefined) {
      return { ok: false, error: 'Order items are invalid.', status: 400 };
    }
    pricedItems.push(applyCanonicalPricing(item, canonicalPricing));
  }

  const itemsSubtotal = calculateItemsSubtotal(pricedItems);
  if (!moneyAmountsEqual(itemsSubtotal, subtotal)) {
    return { ok: false, error: 'Order totals are invalid.', status: 400 };
  }

  const orderCurrencyCode = resolveOrderCurrencyCode(pricedItems);
  if (orderCurrencyCode === null) {
    return { ok: false, error: 'Order item currencies are invalid.', status: 400 };
  }

  const checkoutContent = await getCheckoutContent('en');
  const providerAvailability = await readShippingProviderAvailability();
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
    providerAvailability,
  });
  if (!shippingSelectionResult.ok) {
    return { ok: false, error: shippingSelectionResult.error, status: 400 };
  }
  const shippingSelection = shippingSelectionResult.selection;

  const promoCode = normalizePromoCode(body['promoCode']);
  const discount = roundMoneyAmount(await computeDiscount(itemsSubtotal, promoCode, email));

  const expectedTotal = roundMoneyAmount(itemsSubtotal - discount + shippingSelection.shippingPrice);
  if (expectedTotal < 1) {
    return { ok: false, error: 'Order total is invalid.', status: 400 };
  }
  if (!moneyAmountsEqual(total, expectedTotal)) {
    return { ok: false, error: 'Order totals are invalid.', status: 400 };
  }

  const baseUrl = getWebhookCallbackBaseUrl();
  if (baseUrl === null) {
    return {
      ok: false,
      error: 'Payment callback URL is not configured. Set NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_ECOM_URL.',
      status: 500,
    };
  }

  const session = await getSession();
  const orderId = generateOrderId();

  return {
    ok: true,
    order: {
      orderId,
      userId: session?.id,
      email,
      pricedItems,
      inpostPoint,
      shippingAddress,
      shippingSelection,
      subtotal,
      discount,
      promoCode,
      total,
      currencyCode: orderCurrencyCode,
      baseUrl,
    },
  };
}
