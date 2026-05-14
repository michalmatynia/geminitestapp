import { randomBytes } from 'crypto';
import type { Document, WithId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { normalizeInpostPointCode } from '@/lib/inpost-point-code';

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  size: string;
  price: number;
  priceDisplay: string;
  currencyCode?: string;
  quantity: number;
  imageUrl?: string;
};

export type ShippingCarrier = 'manual' | 'inpost' | 'poczta_polska' | 'dpd';

const SHIPPING_CARRIERS = new Set<ShippingCarrier>(['manual', 'inpost', 'poczta_polska', 'dpd']);

export type InpostPoint = {
  id: string;
  name: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postCode?: string;
  latitude?: number;
  longitude?: number;
};

export type InpostShipment = {
  shipmentId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: string;
  eventCode?: string;
  eventId?: string;
  eventTimestamp?: string;
  shipmentUrl?: string;
  service?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderShipment = {
  carrier?: ShippingCarrier;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InpostTrackingEventRecord = {
  customerReference?: string;
  trackingNumber: string;
  eventId: string;
  eventCode: string;
  timestamp: string;
  receivedAt: string;
  stale?: boolean;
};

export type Order = {
  _id?: string;
  orderId: string;
  userId?: string;
  email: string;
  status: 'pending_payment' | 'processing' | 'in-transit' | 'delivered' | 'cancelled';
  paymentMethod?: 'blik' | 'stripe' | 'paypal';
  payuOrderId?: string;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  items: OrderItem[];
  shippingMethod: string;
  shippingPrice: number;
  shippingCarrier?: ShippingCarrier;
  shippingService?: string;
  inpostPoint?: InpostPoint;
  inpostShipment?: InpostShipment;
  shipment?: OrderShipment;
  inpostEventIds?: string[];
  inpostTrackingEvents?: InpostTrackingEventRecord[];
  shippingAddress: Record<string, string>;
  subtotal: number;
  discount: number;
  promoCode?: string;
  total: number;
  createdAt: string;
  confirmationEmailQueuedAt?: string;
};

export const ORDERS_COLLECTION = 'ecom_orders';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maxLength = 160): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readOptionalString(value: unknown, maxLength = 160): string | undefined {
  const text = readString(value, maxLength);
  return text === '' ? undefined : text;
}

export function sanitizeShippingCarrier(value: unknown): ShippingCarrier {
  if (typeof value === 'string' && SHIPPING_CARRIERS.has(value as ShippingCarrier)) {
    return value as ShippingCarrier;
  }
  return 'manual';
}

export function sanitizeInpostPoint(value: unknown): InpostPoint | null {
  if (!isRecord(value)) return null;

  const id = normalizeInpostPointCode(readString(value['id'] ?? value['name'], 80));
  if (id === null) return null;
  const name = normalizeInpostPointCode(readString(value['name'] ?? id, 120)) ?? id;

  const latitude = readOptionalNumber(value['latitude']);
  const longitude = readOptionalNumber(value['longitude']);

  return {
    id,
    name,
    description: readOptionalString(value['description'], 180),
    addressLine1: readOptionalString(value['addressLine1'], 180),
    addressLine2: readOptionalString(value['addressLine2'], 180),
    city: readOptionalString(value['city'], 100),
    postCode: readOptionalString(value['postCode'], 20),
    latitude,
    longitude,
  };
}

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `ARC-${year}-${suffix}`;
}

export function serializeOrder(doc: WithId<Document>): Order {
  const { _id: mongoId, ...order } = doc;
  return {
    ...(order as Omit<Order, '_id'>),
    _id: mongoId.toString(),
  };
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const db = await getDb();
  const docs = await db
    .collection(ORDERS_COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(serializeOrder);
}
