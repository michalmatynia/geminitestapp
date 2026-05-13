import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { normalizeLocale } from '@/lib/locales';
import { getOrderShippingSummary, getOrderTrackingNumber, getOrderTrackingUrl, type OrderShippingDisplayInput } from '@/lib/order-shipping';
import { ORDERS_COLLECTION, type InpostPoint, type InpostShipment, type Order, type OrderShipment, type ShippingCarrier } from '@/lib/orders';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

type OrderStatus = Order['status'];

const ORDER_STATUS_PROJECTION = {
  status: 1,
  shippingMethod: 1,
  shippingCarrier: 1,
  shippingService: 1,
  inpostPoint: 1,
  inpostShipment: 1,
  shipment: 1,
};

const ORDER_STATUSES = new Set<OrderStatus>(['pending_payment', 'processing', 'in-transit', 'delivered', 'cancelled']);
const SHIPPING_CARRIERS = new Set<ShippingCarrier>(['manual', 'inpost', 'poczta_polska', 'dpd']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maxLength = 160): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readStatus(value: unknown): OrderStatus {
  return ORDER_STATUSES.has(value as OrderStatus) ? value as OrderStatus : 'pending_payment';
}

function readCarrier(value: unknown): ShippingCarrier | undefined {
  return SHIPPING_CARRIERS.has(value as ShippingCarrier) ? value as ShippingCarrier : undefined;
}

function readInpostPoint(value: unknown): InpostPoint | undefined {
  if (!isRecord(value)) return undefined;
  const name = readString(value['name'], 120);
  if (name.length === 0) return undefined;
  const id = readString(value['id'], 80);
  const point: InpostPoint = {
    id: id.length > 0 ? id : name,
    name,
  };
  const addressLine1 = readString(value['addressLine1'], 180);
  const addressLine2 = readString(value['addressLine2'], 180);
  const city = readString(value['city'], 100);
  const postCode = readString(value['postCode'], 20);
  if (addressLine1.length > 0) point.addressLine1 = addressLine1;
  if (addressLine2.length > 0) point.addressLine2 = addressLine2;
  if (city.length > 0) point.city = city;
  if (postCode.length > 0) point.postCode = postCode;
  return point;
}

function readInpostShipment(value: unknown): InpostShipment | undefined {
  if (!isRecord(value)) return undefined;
  const trackingNumber = readString(value['trackingNumber'], 80);
  const shipmentUrl = readString(value['shipmentUrl'], 320);
  const shipment: InpostShipment = {};
  if (trackingNumber.length > 0) shipment.trackingNumber = trackingNumber;
  if (shipmentUrl.length > 0) shipment.shipmentUrl = shipmentUrl;
  return Object.keys(shipment).length > 0 ? shipment : undefined;
}

function readShipment(value: unknown): OrderShipment | undefined {
  if (!isRecord(value)) return undefined;
  const shipment: OrderShipment = {};
  const carrier = readCarrier(value['carrier']);
  const trackingNumber = readString(value['trackingNumber'], 80);
  const trackingUrl = readString(value['trackingUrl'], 320);
  const status = readString(value['status'], 80);
  if (carrier !== undefined) shipment.carrier = carrier;
  if (trackingNumber.length > 0) shipment.trackingNumber = trackingNumber;
  if (trackingUrl.length > 0) shipment.trackingUrl = trackingUrl;
  if (status.length > 0) shipment.status = status;
  return Object.keys(shipment).length > 0 ? shipment : undefined;
}

function publicOrderStatusPayload(order: Record<string, unknown>, localeInput: string | null): Record<string, unknown> {
  const status = readStatus(order['status']);
  const savedShippingMethod = readString(order['shippingMethod']);
  const shippingMethod = savedShippingMethod.length > 0 ? savedShippingMethod : 'Delivery';
  const shippingCarrier = readCarrier(order['shippingCarrier']);
  const inpostPoint = readInpostPoint(order['inpostPoint']);
  const inpostShipment = readInpostShipment(order['inpostShipment']);
  const shipment = readShipment(order['shipment']);
  const shippingInput: OrderShippingDisplayInput = { shippingMethod };
  if (shippingCarrier !== undefined) shippingInput.shippingCarrier = shippingCarrier;
  if (inpostPoint !== undefined) shippingInput.inpostPoint = inpostPoint;
  if (inpostShipment !== undefined) shippingInput.inpostShipment = inpostShipment;
  if (shipment !== undefined) shippingInput.shipment = shipment;

  const shippingService = readString(order['shippingService']);

  return {
    status,
    shippingMethod,
    shippingCarrier,
    shippingService: shippingService.length > 0 ? shippingService : undefined,
    shippingSummary: getOrderShippingSummary(shippingInput, normalizeLocale(localeInput)),
    inpostPointName: inpostPoint?.name,
    trackingNumber: getOrderTrackingNumber(shippingInput),
    trackingUrl: getOrderTrackingUrl(shippingInput),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`order-status:${ip}`, 120, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const { orderId } = await params;
  const normalizedOrderId = orderId.trim().toUpperCase();
  if (normalizedOrderId.length === 0) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const db = await getDb();
  const order = await db
    .collection(ORDERS_COLLECTION)
    .findOne({ orderId: normalizedOrderId }, { projection: ORDER_STATUS_PROJECTION });

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(publicOrderStatusPayload(order, new URL(req.url).searchParams.get('locale')));
}
