import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order, serializeOrder } from '@/lib/orders';
import { verifyPayPalWebhook } from '@/lib/paypal';
import { sendOrderConfirmation } from '@/lib/email';
import { fulfillInpostOrder } from '@/lib/inpost';

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    purchase_units?: Array<{ reference_id?: string }>;
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
  };
};

function mapPayPalStatus(eventType: string): Order['status'] | null {
  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED':
    case 'CHECKOUT.ORDER.COMPLETED':
      return 'processing';
    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED':
    case 'CHECKOUT.ORDER.VOIDED':
      return 'cancelled';
    default:
      return null;
  }
}

function extractPayPalOrderId(event: PayPalWebhookEvent): string {
  const referenceId = event.resource?.purchase_units?.[0]?.reference_id?.trim() ?? '';
  if (referenceId !== '') return referenceId.toUpperCase();
  const supplementaryOrderId = event.resource?.supplementary_data?.related_ids?.order_id?.trim() ?? '';
  return supplementaryOrderId.toUpperCase();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  const verified = await verifyPayPalWebhook(rawBody, {
    'paypal-auth-algo': req.headers.get('paypal-auth-algo'),
    'paypal-cert-url': req.headers.get('paypal-cert-url'),
    'paypal-transmission-id': req.headers.get('paypal-transmission-id'),
    'paypal-transmission-sig': req.headers.get('paypal-transmission-sig'),
    'paypal-transmission-time': req.headers.get('paypal-transmission-time'),
  });

  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event_type ?? '';
  const newStatus = mapPayPalStatus(eventType);
  if (newStatus === null) {
    return NextResponse.json({ received: true });
  }

  const paypalCaptureId = event.resource?.id?.trim() ?? '';
  const localOrderId = extractPayPalOrderId(event);

  if (paypalCaptureId === '' && localOrderId === '') {
    return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);

  const candidates: Record<string, string>[] = [];
  if (localOrderId !== '') candidates.push({ orderId: localOrderId });
  if (paypalCaptureId !== '') candidates.push({ paypalOrderId: paypalCaptureId });
  const filter = candidates.length === 1 ? candidates[0] : { $or: candidates };

  const order = await collection.findOneAndUpdate(
    filter,
    { $set: { status: newStatus } },
    { returnDocument: 'after' },
  );

  if (order === null) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (newStatus === 'processing') {
    // Atomic guard: claim the right to send the confirmation email exactly once,
    // even when PayPal retries the webhook on transient failures.
    const emailClaim = await collection.updateOne(
      { _id: order._id, confirmationEmailQueuedAt: { $exists: false } },
      { $set: { confirmationEmailQueuedAt: new Date().toISOString() } },
    );
    if (emailClaim.modifiedCount > 0) {
      await sendOrderConfirmation(serializeOrder(order)).catch(() => undefined);
      await fulfillInpostOrder(serializeOrder(order)).catch(() => undefined);
    }
  }

  return NextResponse.json({ received: true });
}
