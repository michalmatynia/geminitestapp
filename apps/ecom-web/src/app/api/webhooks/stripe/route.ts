import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, type Order, serializeOrder } from '@/lib/orders';
import { verifyStripeWebhook } from '@/lib/stripe';
import { sendOrderConfirmation } from '@/lib/email';
import { fulfillInpostOrder } from '@/lib/inpost';

type StripeEvent = {
  type?: string;
  data?: {
    object?: {
      id?: string;
      metadata?: Record<string, string>;
      status?: string;
    };
  };
};

function mapStripeStatus(stripeStatus: string): Order['status'] | null {
  switch (stripeStatus) {
    case 'succeeded':
      return 'processing';
    case 'canceled':
      return 'cancelled';
    case 'requires_payment_method':
    case 'processing':
    case 'requires_action':
    case 'requires_confirmation':
    case 'requires_capture':
      return 'pending_payment';
    default:
      return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('stripe-signature');

  if (!(await verifyStripeWebhook(rawBody, signatureHeader))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.type ?? '';
  if (!eventType.startsWith('payment_intent.')) {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data?.object;
  const paymentIntentId = paymentIntent?.id?.trim() ?? '';
  const orderId = paymentIntent?.metadata?.orderId?.trim().toUpperCase() ?? '';
  const stripeStatus = paymentIntent?.status ?? '';

  if (paymentIntentId === '') {
    return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
  }

  const newStatus = mapStripeStatus(stripeStatus);
  if (newStatus === null) {
    return NextResponse.json({ received: true });
  }

  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);

  const filter = orderId !== ''
    ? { $or: [{ stripePaymentIntentId: paymentIntentId }, { orderId }] }
    : { stripePaymentIntentId: paymentIntentId };

  const order = await collection.findOneAndUpdate(
    filter,
    { $set: { status: newStatus } },
    { returnDocument: 'after' },
  );

  if (order === null) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (newStatus === 'processing') {
    await sendOrderConfirmation(serializeOrder(order)).catch(() => undefined);
    await fulfillInpostOrder(serializeOrder(order)).catch(() => undefined);
  }

  return NextResponse.json({ received: true });
}
