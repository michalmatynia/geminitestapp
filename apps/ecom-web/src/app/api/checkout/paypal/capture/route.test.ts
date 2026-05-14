/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
  capturePayPalOrder: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  fulfillInpostOrder: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({
      findOne: mocks.findOne,
      findOneAndUpdate: mocks.findOneAndUpdate,
      updateOne: mocks.updateOne,
    }),
  })),
}));

vi.mock('@/lib/paypal', () => ({
  capturePayPalOrder: mocks.capturePayPalOrder,
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}));

vi.mock('@/lib/inpost', () => ({
  fulfillInpostOrder: mocks.fulfillInpostOrder,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

vi.mock('@/lib/orders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/orders')>('@/lib/orders');
  return { ...actual, serializeOrder: (doc: unknown) => doc };
});

import { POST } from './route';

const VALID_ORDER_ID = 'ARC-2026-DEADBEEF';
const VALID_PAYPAL_ORDER_ID = 'PP-ORDER-TEST-123';

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/checkout/paypal/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

const PENDING_ORDER = { _id: 'mongo-id-1', orderId: VALID_ORDER_ID, status: 'pending_payment', paypalOrderId: VALID_PAYPAL_ORDER_ID, email: 'buyer@example.com' };
const PROCESSING_ORDER = { _id: 'mongo-id-1', orderId: VALID_ORDER_ID, status: 'processing', email: 'buyer@example.com' };

describe('PayPal capture route', () => {
  beforeEach(() => {
    mocks.findOne.mockReset();
    mocks.findOneAndUpdate.mockReset();
    mocks.updateOne.mockReset();
    mocks.capturePayPalOrder.mockReset();
    mocks.sendOrderConfirmation.mockReset();
    mocks.fulfillInpostOrder.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.getClientIp.mockReset();

    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.findOne.mockResolvedValue(PENDING_ORDER);
    mocks.findOneAndUpdate.mockResolvedValue(PROCESSING_ORDER);
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.capturePayPalOrder.mockResolvedValue({ paypalOrderId: VALID_PAYPAL_ORDER_ID, status: 'COMPLETED' });
    mocks.sendOrderConfirmation.mockResolvedValue(undefined);
    mocks.fulfillInpostOrder.mockResolvedValue(undefined);
  });

  it('captures payment, updates order to processing, and sends confirmation', async () => {
    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    const body = await res.json() as { orderId?: string; status?: string };

    expect(res.status).toBe(200);
    expect(body.orderId).toBe(VALID_ORDER_ID);
    expect(body.status).toBe('processing');
    expect(mocks.capturePayPalOrder).toHaveBeenCalledWith(VALID_PAYPAL_ORDER_ID);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { orderId: VALID_ORDER_ID },
      { $set: { status: 'processing' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(PROCESSING_ORDER);
    expect(mocks.fulfillInpostOrder).toHaveBeenCalledWith(PROCESSING_ORDER);
  });

  it('does not send confirmation email when webhook already claimed it (idempotency)', async () => {
    mocks.updateOne.mockResolvedValue({ modifiedCount: 0 });

    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));

    expect(res.status).toBe(200);
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.fulfillInpostOrder).not.toHaveBeenCalled();
  });

  it('returns 200 idempotently when order is already processed', async () => {
    mocks.findOne.mockResolvedValue({ orderId: VALID_ORDER_ID, status: 'processing' });

    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    const body = await res.json() as { status?: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe('processing');
    expect(mocks.capturePayPalOrder).not.toHaveBeenCalled();
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown order ID', async () => {
    mocks.findOne.mockResolvedValue(null);

    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    expect(res.status).toBe(404);
    expect(mocks.capturePayPalOrder).not.toHaveBeenCalled();
  });

  it('returns 422 and cancels the order when PayPal declines the capture', async () => {
    mocks.capturePayPalOrder.mockResolvedValue({ paypalOrderId: VALID_PAYPAL_ORDER_ID, status: 'DECLINED' });

    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(422);
    expect(body.error).toBe('PayPal payment was declined.');
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: VALID_ORDER_ID, status: 'pending_payment' },
      { $set: { status: 'cancelled' } },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('returns 502 when PayPal capture throws', async () => {
    mocks.capturePayPalOrder.mockRejectedValue(new Error('PayPal capture failed: 500'));

    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    const body = await res.json() as { error?: string };

    expect(res.status).toBe(502);
    expect(body.error).toBe('PayPal capture failed: 500');
  });

  it('returns 400 for an invalid order ID format', async () => {
    const res = await POST(makeJsonRequest({ orderId: 'not-valid', paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    expect(res.status).toBe(400);
    expect(mocks.capturePayPalOrder).not.toHaveBeenCalled();
  });

  it('returns 400 when paypalOrderId is missing', async () => {
    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: '' }));
    expect(res.status).toBe(400);
    expect(mocks.capturePayPalOrder).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 30 });

    const res = await POST(makeJsonRequest({ orderId: VALID_ORDER_ID, paypalOrderId: VALID_PAYPAL_ORDER_ID }));
    expect(res.status).toBe(429);
    expect(mocks.capturePayPalOrder).not.toHaveBeenCalled();
  });
});
