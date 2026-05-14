/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  verifyPayPalWebhook: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  fulfillInpostOrder: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ findOneAndUpdate: mocks.findOneAndUpdate }),
  })),
}));

vi.mock('@/lib/paypal', () => ({
  verifyPayPalWebhook: mocks.verifyPayPalWebhook,
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

function makeWebhookRequest(event: unknown): NextRequest {
  const body = JSON.stringify(event);
  return new Request('http://localhost/api/webhooks/paypal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/CERT-123',
      'paypal-transmission-id': 'tx-id-test',
      'paypal-transmission-sig': 'sig-abc-xyz',
      'paypal-transmission-time': '2026-05-13T00:00:00Z',
    },
    body,
  }) as NextRequest;
}

function makeCaptureCompletedEvent(orderId = 'ARC-2026-DEADBEEF'): unknown {
  return {
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'capture-id-abc',
      status: 'COMPLETED',
      purchase_units: [{ reference_id: orderId }],
    },
  };
}

const PROCESSING_ORDER = { orderId: 'ARC-2026-DEADBEEF', status: 'processing', email: 'buyer@example.com' };
const CANCELLED_ORDER = { orderId: 'ARC-2026-DEADBEEF', status: 'cancelled' };

describe('PayPal webhook route', () => {
  beforeEach(() => {
    mocks.findOneAndUpdate.mockReset();
    mocks.verifyPayPalWebhook.mockReset();
    mocks.sendOrderConfirmation.mockReset();
    mocks.fulfillInpostOrder.mockReset();

    mocks.verifyPayPalWebhook.mockResolvedValue(true);
    mocks.findOneAndUpdate.mockResolvedValue(PROCESSING_ORDER);
    mocks.sendOrderConfirmation.mockResolvedValue(undefined);
    mocks.fulfillInpostOrder.mockResolvedValue(undefined);
  });

  it('returns 401 when PayPal signature verification fails', async () => {
    mocks.verifyPayPalWebhook.mockResolvedValue(false);

    const res = await POST(makeWebhookRequest(makeCaptureCompletedEvent()));
    expect(res.status).toBe(401);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('transitions order to processing and sends confirmation on PAYMENT.CAPTURE.COMPLETED', async () => {
    const res = await POST(makeWebhookRequest(makeCaptureCompletedEvent()));
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

  it('transitions order to processing on CHECKOUT.ORDER.COMPLETED', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.COMPLETED',
      resource: {
        id: 'capture-id-xyz',
        purchase_units: [{ reference_id: 'ARC-2026-DEADBEEF' }],
      },
    };

    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { status: 'processing' } },
      expect.anything(),
    );
  });

  it('transitions order to cancelled on PAYMENT.CAPTURE.DENIED', async () => {
    mocks.findOneAndUpdate.mockResolvedValue(CANCELLED_ORDER);
    const event = {
      event_type: 'PAYMENT.CAPTURE.DENIED',
      resource: {
        id: 'capture-id-abc',
        purchase_units: [{ reference_id: 'ARC-2026-DEADBEEF' }],
      },
    };

    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('transitions order to cancelled on CHECKOUT.ORDER.VOIDED', async () => {
    mocks.findOneAndUpdate.mockResolvedValue(CANCELLED_ORDER);
    const event = {
      event_type: 'CHECKOUT.ORDER.VOIDED',
      resource: { id: 'order-id-abc', purchase_units: [{ reference_id: 'ARC-2026-DEADBEEF' }] },
    };

    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { status: 'cancelled' } },
      expect.anything(),
    );
  });

  it('ignores unrecognised event types and returns received:true', async () => {
    const event = { event_type: 'BILLING.SUBSCRIPTION.CREATED', resource: { id: 'sub-1' } };

    const res = await POST(makeWebhookRequest(event));
    const body = await res.json() as { received?: boolean };

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when no matching order is found', async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const res = await POST(makeWebhookRequest(makeCaptureCompletedEvent()));
    expect(res.status).toBe(404);
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('uses supplementary orderId when purchase_units reference is absent', async () => {
    const event = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'capture-id-abc',
        supplementary_data: {
          related_ids: { order_id: 'ARC-2026-SUPPDATA' },
        },
      },
    };

    await POST(makeWebhookRequest(event));

    const filter = mocks.findOneAndUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(JSON.stringify(filter)).toContain('ARC-2026-SUPPDATA');
  });
});
