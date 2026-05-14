/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
  verifyStripeWebhook: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  fulfillInpostOrder: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ findOneAndUpdate: mocks.findOneAndUpdate, updateOne: mocks.updateOne }),
  })),
}));

vi.mock('@/lib/stripe', () => ({
  verifyStripeWebhook: mocks.verifyStripeWebhook,
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}));

vi.mock('@/lib/inpost', () => ({
  fulfillInpostOrder: mocks.fulfillInpostOrder,
}));

vi.mock('@/lib/orders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/orders')>('@/lib/orders');
  return { ...actual, serializeOrder: (doc: unknown) => doc };
});

import { POST } from './route';

function makeWebhookRequest(event: unknown, signature = 'v1=valid-sig'): NextRequest {
  const body = JSON.stringify(event);
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
    body,
  }) as NextRequest;
}

function makePaymentIntentEvent(type: string, status: string, orderId = 'ARC-2026-DEADBEEF'): unknown {
  return {
    type,
    data: {
      object: {
        id: 'pi_test_abc',
        metadata: { orderId },
        status,
      },
    },
  };
}

const PROCESSING_ORDER = { orderId: 'ARC-2026-DEADBEEF', status: 'processing', email: 'buyer@example.com' };

describe('Stripe webhook route', () => {
  beforeEach(() => {
    mocks.findOneAndUpdate.mockReset();
    mocks.updateOne.mockReset();
    mocks.verifyStripeWebhook.mockReset();
    mocks.sendOrderConfirmation.mockReset();
    mocks.fulfillInpostOrder.mockReset();

    mocks.verifyStripeWebhook.mockResolvedValue(true);
    mocks.findOneAndUpdate.mockResolvedValue(PROCESSING_ORDER);
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.sendOrderConfirmation.mockResolvedValue(undefined);
    mocks.fulfillInpostOrder.mockResolvedValue(undefined);
  });

  it('returns 401 for an invalid Stripe signature', async () => {
    mocks.verifyStripeWebhook.mockResolvedValue(false);

    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.succeeded', 'succeeded'), 'v1=bad'));
    expect(res.status).toBe(401);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('transitions order to processing and sends confirmation on payment_intent.succeeded', async () => {
    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.succeeded', 'succeeded')));
    const body = await res.json() as { received?: boolean };

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { status: 'processing' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(PROCESSING_ORDER);
    expect(mocks.fulfillInpostOrder).toHaveBeenCalledWith(PROCESSING_ORDER);
  });

  it('transitions order to cancelled on payment_intent.canceled', async () => {
    const cancelledOrder = { orderId: 'ARC-2026-DEADBEEF', status: 'cancelled' };
    mocks.findOneAndUpdate.mockResolvedValue(cancelledOrder);

    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.canceled', 'canceled')));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('transitions order to pending_payment on payment_intent.processing', async () => {
    const pendingOrder = { orderId: 'ARC-2026-DEADBEEF', status: 'pending_payment' };
    mocks.findOneAndUpdate.mockResolvedValue(pendingOrder);

    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.processing', 'processing')));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { status: 'pending_payment' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('returns received:true and skips DB for non-payment-intent events', async () => {
    const res = await POST(makeWebhookRequest({ type: 'customer.created', data: { object: {} } }));
    const body = await res.json() as { received?: boolean };

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns received:true and skips DB for unknown payment_intent statuses', async () => {
    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.created', 'unknown_status')));
    const body = await res.json() as { received?: boolean };

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when no matching order is found', async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.succeeded', 'succeeded')));
    expect(res.status).toBe(404);
  });

  it('uses orderId metadata to locate the order', async () => {
    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.succeeded', 'succeeded', 'ARC-2026-CUSTMORD')));

    expect(res.status).toBe(200);
    const filter = mocks.findOneAndUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(JSON.stringify(filter)).toContain('ARC-2026-CUSTMORD');
  });

  it('does not send confirmation email when webhook is already processed (idempotency)', async () => {
    mocks.updateOne.mockResolvedValue({ modifiedCount: 0 });

    const res = await POST(makeWebhookRequest(makePaymentIntentEvent('payment_intent.succeeded', 'succeeded')));

    expect(res.status).toBe(200);
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.fulfillInpostOrder).not.toHaveBeenCalled();
  });
});
