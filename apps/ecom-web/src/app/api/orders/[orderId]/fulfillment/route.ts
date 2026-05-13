import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildCarrierTrackingUrl } from '@/lib/carrier-tracking';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, serializeOrder, type Order, type OrderShipment } from '@/lib/orders';

type OrderStatus = Order['status'];

const ORDER_STATUSES = new Set<OrderStatus>(['pending_payment', 'processing', 'in-transit', 'delivered', 'cancelled']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maxLength = 160): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readStatus(value: unknown): OrderStatus | null {
  return ORDER_STATUSES.has(value as OrderStatus) ? value as OrderStatus : null;
}

function readTrackingUrl(value: unknown): string | null {
  const text = readString(value, 320);
  if (text.length === 0) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line complexity
function buildShipment(
  order: Order,
  body: Record<string, unknown>,
  status: OrderStatus,
  now: string,
): OrderShipment | null | undefined {
  const trackingNumber = readString(body['trackingNumber'], 80);
  const trackingUrl = readTrackingUrl(body['trackingUrl']);
  const note = readString(body['note'], 240);
  if (trackingUrl === null) return null;
  if (trackingNumber.length === 0 && trackingUrl.length === 0 && note.length === 0) return undefined;

  const shipment: OrderShipment = {
    status,
    updatedAt: now,
  };
  if (order.shippingCarrier !== undefined) shipment.carrier = order.shippingCarrier;
  if (order.shippingService !== undefined) shipment.service = order.shippingService;
  if (order.shipment?.createdAt !== undefined) shipment.createdAt = order.shipment.createdAt;
  else shipment.createdAt = now;
  if (trackingNumber.length > 0) shipment.trackingNumber = trackingNumber;
  const resolvedTrackingUrl = trackingUrl.length > 0
    ? trackingUrl
    : buildCarrierTrackingUrl(order.shippingCarrier, trackingNumber);
  if (resolvedTrackingUrl !== undefined) shipment.trackingUrl = resolvedTrackingUrl;
  if (note.length > 0) shipment.note = note;
  return shipment;
}

// eslint-disable-next-line complexity
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orderId } = await params;
  const normalizedOrderId = orderId.trim();
  if (normalizedOrderId.length === 0) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid fulfillment payload' }, { status: 400 });
  }

  const status = readStatus(body['status']);
  if (status === null) {
    return NextResponse.json({ error: 'A valid order status is required' }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);
  const doc = await collection.findOne({ orderId: normalizedOrderId });
  if (doc === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const order = serializeOrder(doc);
  if (order.shippingCarrier === 'inpost') {
    return NextResponse.json({ error: 'Use InPost fulfillment for InPost orders.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const shipment = buildShipment(order, body, status, now);
  if (shipment === null) {
    return NextResponse.json({ error: 'Tracking URL is invalid' }, { status: 400 });
  }

  const update: Record<string, unknown> = { status };
  if (shipment !== undefined) update['shipment'] = shipment;
  await collection.updateOne({ orderId: normalizedOrderId }, { $set: update });
  const updatedDoc = await collection.findOne({ orderId: normalizedOrderId });
  if (updatedDoc === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ order: serializeOrder(updatedDoc) });
}
