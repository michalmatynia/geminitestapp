/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  fulfillInpostOrderByOrderId: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/inpost', () => ({
  fulfillInpostOrderByOrderId: mocks.fulfillInpostOrderByOrderId,
}));

function makeRequest(): NextRequest {
  return new Request('http://localhost/api/orders/ARC-2026-ABCD1234/inpost/fulfill', {
    method: 'POST',
  }) as NextRequest;
}

function makeParams(orderId = 'ARC-2026-ABCD1234'): { params: Promise<{ orderId: string }> } {
  return { params: Promise.resolve({ orderId }) };
}

describe('InPost fulfillment retry route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.fulfillInpostOrderByOrderId.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
  });

  it('rejects non-admin requests before loading the order', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(403);
    expect(mocks.fulfillInpostOrderByOrderId).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    mocks.fulfillInpostOrderByOrderId.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(mocks.fulfillInpostOrderByOrderId).toHaveBeenCalledWith('ARC-2026-ABCD1234');
  });

  it('returns 503 when InPost credentials are not configured', async () => {
    mocks.fulfillInpostOrderByOrderId.mockResolvedValue({
      order: { orderId: 'ARC-2026-ABCD1234' },
      shipment: null,
      created: false,
      skippedReason: 'not_configured',
    });

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { skippedReason?: string };

    expect(response.status).toBe(503);
    expect(body.skippedReason).toBe('not_configured');
  });

  it('returns 409 when the order is not ready for fulfillment', async () => {
    mocks.fulfillInpostOrderByOrderId.mockResolvedValue({
      order: { orderId: 'ARC-2026-ABCD1234' },
      shipment: null,
      created: false,
      skippedReason: 'not_ready',
    });

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { skippedReason?: string };

    expect(response.status).toBe(409);
    expect(body.skippedReason).toBe('not_ready');
  });

  it('creates and returns a shipment for a retryable InPost order', async () => {
    mocks.fulfillInpostOrderByOrderId.mockResolvedValue({
      order: { orderId: 'ARC-2026-ABCD1234' },
      shipment: {
        shipmentId: '123',
        trackingNumber: 'TRACK123',
        status: 'created',
      },
      created: true,
    });

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { created?: boolean; shipment?: { trackingNumber?: string } };

    expect(response.status).toBe(200);
    expect(body.created).toBe(true);
    expect(body.shipment?.trackingNumber).toBe('TRACK123');
  });

  it('surfaces InPost gateway failures as 502', async () => {
    mocks.fulfillInpostOrderByOrderId.mockRejectedValue(new Error('ShipX unavailable'));

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe('ShipX unavailable');
  });
});
