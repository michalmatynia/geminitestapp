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

// eslint-disable-next-line complexity
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('OpenPayU-Signature');

  if (!verifyPayUWebhook(rawBody, signatureHeader)) {
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
  let filter: { payuOrderId?: string; orderId?: string } | null = null;
  if (payuOrderId !== undefined && payuOrderId.length > 0) {
    filter = { payuOrderId };
  } else if (extOrderId !== undefined && extOrderId.length > 0) {
    filter = { orderId: extOrderId };
  }

  if (!filter) {
    return NextResponse.json({ ok: true });
  }

  const updatedDoc = await db
    .collection(ORDERS_COLLECTION)
    .findOneAndUpdate(filter, { $set: { status: newStatus } }, { returnDocument: 'after' });

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
