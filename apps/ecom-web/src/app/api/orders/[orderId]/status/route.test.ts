/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ findOne: mocks.findOne }),
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

function makeRequest(orderId: string): NextRequest {
  return new Request(`http://localhost/api/orders/${orderId}/status`) as NextRequest;
}

function makeParams(orderId: string) {
  return { params: Promise.resolve({ orderId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockReturnValue({ allowed: true });
});

describe('GET /api/orders/[orderId]/status', () => {
  it('returns status for an existing order', async () => {
    mocks.findOne.mockResolvedValue({
      status: 'processing',
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shippingService: 'dpd_courier_standard',
    });

    const res = await GET(makeRequest('ARC-2026-ABCD1234'), makeParams('ARC-2026-ABCD1234'));
    const body = await res.json() as { status: string; shippingSummary?: string; shippingCarrier?: string; shippingService?: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe('processing');
    expect(body.shippingSummary).toBe('DPD Courier');
    expect(body.shippingCarrier).toBe('dpd');
    expect(body.shippingService).toBe('dpd_courier_standard');
  });

  it('normalizes lowercase order IDs before querying', async () => {
    mocks.findOne.mockResolvedValue({
      status: 'processing',
      shippingMethod: 'DPD Courier',
    });

    const res = await GET(makeRequest('arc-2026-abcd1234'), makeParams('arc-2026-abcd1234'));

    expect(res.status).toBe(200);
    expect(mocks.findOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCD1234' },
      expect.any(Object),
    );
  });

  it('returns safe InPost pickup and tracking details', async () => {
    mocks.findOne.mockResolvedValue({
      status: 'in-transit',
      shippingMethod: 'InPost Parcel Locker',
      shippingCarrier: 'inpost',
      inpostPoint: {
        name: 'WAW01A',
        addressLine1: 'ul. Testowa 1',
        postCode: '00-001',
        city: 'Warsaw',
      },
      inpostShipment: {
        trackingNumber: 'TRACK123',
        shipmentUrl: 'https://inpost.example.test/shipments/TRACK123',
      },
      shippingAddress: { address: 'Private customer address' },
      email: 'buyer@example.com',
    });

    const res = await GET(
      new Request('http://localhost/api/orders/ARC-2026-ABCD1234/status?locale=pl') as NextRequest,
      makeParams('ARC-2026-ABCD1234'),
    );
    const body = await res.json() as {
      shippingSummary?: string;
      inpostPointName?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      email?: string;
    };

    expect(res.status).toBe(200);
    expect(body.shippingSummary).toBe('InPost Parcel Locker / Paczkomat WAW01A / ul. Testowa 1, 00-001 Warsaw / Tracking: TRACK123');
    expect(body.inpostPointName).toBe('WAW01A');
    expect(body.trackingNumber).toBe('TRACK123');
    expect(body.trackingUrl).toBe('https://inpost.example.test/shipments/TRACK123');
    expect(body.email).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('Private customer address');
  });

  it('returns manual courier tracking details from generic shipment data', async () => {
    mocks.findOne.mockResolvedValue({
      status: 'in-transit',
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shipment: {
        trackingNumber: 'DPD123',
        trackingUrl: 'https://track.example.test/DPD123',
      },
    });

    const res = await GET(makeRequest('ARC-2026-ABCD1234'), makeParams('ARC-2026-ABCD1234'));
    const body = await res.json() as { shippingSummary?: string; trackingNumber?: string; trackingUrl?: string };

    expect(res.status).toBe(200);
    expect(body.shippingSummary).toBe('DPD Courier / Tracking: DPD123');
    expect(body.trackingNumber).toBe('DPD123');
    expect(body.trackingUrl).toBe('https://track.example.test/DPD123');
  });

  it('does not expose unsafe tracking URLs', async () => {
    mocks.findOne.mockResolvedValue({
      status: 'in-transit',
      shippingMethod: 'DPD Courier',
      shippingCarrier: 'dpd',
      shipment: {
        trackingNumber: 'DPD123',
        trackingUrl: 'javascript:alert(1)',
      },
    });

    const res = await GET(makeRequest('ARC-2026-ABCD1234'), makeParams('ARC-2026-ABCD1234'));
    const body = await res.json() as { trackingNumber?: string; trackingUrl?: string };

    expect(res.status).toBe(200);
    expect(body.trackingNumber).toBe('DPD123');
    expect(body.trackingUrl).toBeUndefined();
  });

  it('returns 404 for an unknown well-formed order', async () => {
    mocks.findOne.mockResolvedValue(null);

    const res = await GET(makeRequest('ARC-2026-00000000'), makeParams('ARC-2026-00000000'));

    expect(res.status).toBe(404);
  });

  it('rejects malformed order IDs before querying MongoDB', async () => {
    const res = await GET(makeRequest('ARC-UNKNOWN'), makeParams('ARC-UNKNOWN'));

    expect(res.status).toBe(400);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false });

    const res = await GET(makeRequest('ARC-2026-ABCD1234'), makeParams('ARC-2026-ABCD1234'));

    expect(res.status).toBe(429);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('queries only safe public tracking fields from MongoDB', async () => {
    mocks.findOne.mockResolvedValue({ status: 'pending_payment' });

    await GET(makeRequest('ARC-2026-ABCDEF12'), makeParams('ARC-2026-ABCDEF12'));

    expect(mocks.findOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCDEF12' },
      {
        projection: {
          status: 1,
          shippingMethod: 1,
          shippingCarrier: 1,
          shippingService: 1,
          inpostPoint: 1,
          inpostShipment: 1,
          shipment: 1,
        },
      },
    );
  });
});
