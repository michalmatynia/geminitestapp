import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order, serializeOrder } from '@/lib/orders';
import { verifyPayUWebhook } from '@/lib/payu';
import { sendOrderConfirmation } from '@/lib/email';
import { fulfillInpostOrder } from '@/lib/inpost';

interface PayUNotification {
  order?: {
    orderId?: string;
    extOrderId?: string;
    status?: string;
  };
}

// Maps PayU order statuses to our internal order statuses.
function mapStatus(payuStatus: string): Order['status'] | null {
  switch (payuStatus) {
    case 'COMPLETED':
      return 'processing';
    case 'CANCELED':
    case 'REJECTED':
      return 'cancelled';
    case 'PENDING':
    case 'WAITING_FOR_CONFIRMATION':
      return 'pending_payment';
    default:
      return null;
  }
}

function cleanOrderLookupId(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildOrderLookupFilter(payuOrderId: string | undefined, extOrderId: string | undefined): Record<string, unknown> | null {
  const payuId = cleanOrderLookupId(payuOrderId);
  const localOrderId = cleanOrderLookupId(extOrderId);
  const candidates: Record<string, string>[] = [];
  if (payuId.length > 0) candidates.push({ payuOrderId: payuId });
  if (localOrderId.length > 0) candidates.push({ orderId: localOrderId });
  if (candidates.length === 0) return null;
  return candidates.length === 1 ? candidates[0] : { $or: candidates };
}

// eslint-disable-next-line complexity
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('OpenPayU-Signature');

  if (!(await verifyPayUWebhook(rawBody, signatureHeader))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let notification: PayUNotification;
  try {
    notification = JSON.parse(rawBody) as PayUNotification;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payuOrderId = notification.order?.orderId;
  const payuStatus = notification.order?.status ?? '';
  // extOrderId is our orderId (e.g. ARC-2026-XXXXXXXX)
  const extOrderId = notification.order?.extOrderId;

  if (payuStatus.length === 0) {
    return NextResponse.json({ ok: true }); // ignore non-order notifications
  }

  const newStatus = mapStatus(payuStatus);
  if (newStatus === null) {
    return NextResponse.json({ ok: true }); // unknown status — acknowledge but don't update
  }

  const db = await getDb();
  const filter = buildOrderLookupFilter(payuOrderId, extOrderId);
  if (!filter) {
    return NextResponse.json({ ok: true });
  }

  const update: Record<string, unknown> = { status: newStatus };
  const cleanPayuOrderId = cleanOrderLookupId(payuOrderId);
  if (cleanPayuOrderId.length > 0) update['payuOrderId'] = cleanPayuOrderId;
  if (newStatus === 'processing') {
    filter['status'] = 'pending_payment';
    filter['confirmationEmailQueuedAt'] = { $exists: false };
    update['confirmationEmailQueuedAt'] = new Date().toISOString();
  } else if (newStatus === 'cancelled' || newStatus === 'pending_payment') {
    filter['status'] = 'pending_payment';
  }

  const updatedDoc = await db
    .collection(ORDERS_COLLECTION)
    .findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' });

  // Send confirmation email only once, when the payment is confirmed by the bank.
  if (newStatus === 'processing' && updatedDoc) {
    const order = serializeOrder(updatedDoc);
    let emailOrder = order;
    try {
      const shipment = await fulfillInpostOrder(order);
      if (shipment) emailOrder = { ...order, inpostShipment: shipment };
    } catch {
      // In production we ignore errors when creating shipment for webhook confirmations.
    }
    void sendOrderConfirmation(emailOrder).catch(() => {
      // No-op if confirmation email cannot be sent in webhook flow.
    });
  }

  return NextResponse.json({ ok: true });
}
