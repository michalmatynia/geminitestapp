/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshInpostShipmentByOrderId: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/inpost', () => ({
  refreshInpostShipmentByOrderId: mocks.refreshInpostShipmentByOrderId,
}));

function makeRequest(): NextRequest {
  return new Request('http://localhost/api/orders/ARC-2026-ABCD1234/inpost/refresh', {
    method: 'POST',
  }) as NextRequest;
}

function makeParams(orderId = 'ARC-2026-ABCD1234'): { params: Promise<{ orderId: string }> } {
  return { params: Promise.resolve({ orderId }) };
}

describe('InPost status refresh route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.refreshInpostShipmentByOrderId.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
  });

  it('rejects non-admin requests before refreshing', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await POST(makeRequest(), makeParams());

    expect(response.status).toBe(403);
    expect(mocks.refreshInpostShipmentByOrderId).not.toHaveBeenCalled();
  });

  it('returns refreshed shipment data', async () => {
    mocks.refreshInpostShipmentByOrderId.mockResolvedValue({
      order: { orderId: 'ARC-2026-ABCD1234' },
      shipment: {
        trackingNumber: 'TRACK123',
        status: 'delivered',
      },
      refreshed: true,
    });

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { refreshed?: boolean; shipment?: { status?: string } };

    expect(response.status).toBe(200);
    expect(body.refreshed).toBe(true);
    expect(body.shipment?.status).toBe('delivered');
    expect(mocks.refreshInpostShipmentByOrderId).toHaveBeenCalledWith('ARC-2026-ABCD1234');
  });

  it('returns 503 when Shipping API credentials are missing', async () => {
    mocks.refreshInpostShipmentByOrderId.mockResolvedValue({
      order: { orderId: 'ARC-2026-ABCD1234' },
      shipment: null,
      refreshed: false,
      skippedReason: 'not_configured',
    });

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { skippedReason?: string };

    expect(response.status).toBe(503);
    expect(body.skippedReason).toBe('not_configured');
  });

  it('surfaces InPost gateway failures as 502', async () => {
    mocks.refreshInpostShipmentByOrderId.mockRejectedValue(new Error('Shipping API unavailable'));

    const response = await POST(makeRequest(), makeParams());
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe('Shipping API unavailable');
  });
});
