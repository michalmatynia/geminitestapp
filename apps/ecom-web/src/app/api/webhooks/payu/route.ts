import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('OpenPayU-Signature');

  // In production, always verify the signature. In development (no PAYU_SECOND_KEY
  // configured) we allow unsigned notifications so local testing works.
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev && !verifyPayUWebhook(rawBody, signatureHeader)) {
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

  if (!payuStatus) {
    return NextResponse.json({ ok: true }); // ignore non-order notifications
  }

  const newStatus = mapStatus(payuStatus);
  if (!newStatus) {
    return NextResponse.json({ ok: true }); // unknown status — acknowledge but don't update
  }

  const db = await getDb();
  const filter = payuOrderId
    ? { payuOrderId }
    : extOrderId
      ? { orderId: extOrderId }
      : null;

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
    } catch (err: unknown) {
      console.error('Failed to create InPost shipment', err);
    }
    void sendOrderConfirmation(emailOrder).catch((err: unknown) => {
      console.error('Failed to send BLIK order confirmation email', err);
    });
  }

  return NextResponse.json({ ok: true });
}
