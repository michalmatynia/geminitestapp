/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOne: vi.fn(),
  readDpdProviderSettings: vi.fn(),
  readPocztaPolskaProviderSettings: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({
      findOne: mocks.findOne,
      updateOne: mocks.updateOne,
    }),
  })),
}));

vi.mock('@/lib/providerSettings', () => ({
  readDpdProviderSettings: mocks.readDpdProviderSettings,
  readPocztaPolskaProviderSettings: mocks.readPocztaPolskaProviderSettings,
}));

function makeOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: { toString: () => 'mongo-order-id' },
    orderId: 'ARC-2026-ABCD1234',
    email: 'buyer@example.com',
    status: 'processing',
    items: [],
    shippingMethod: 'DPD Courier',
    shippingPrice: 12,
    shippingCarrier: 'dpd',
    shippingService: 'dpd_courier_standard',
    shippingAddress: {},
    subtotal: 100,
    discount: 0,
    total: 112,
    createdAt: '2026-05-13T10:00:00.000Z',
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/orders/ARC-2026-ABCD1234/fulfillment', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as NextRequest;
}

function makeParams(orderId = 'ARC-2026-ABCD1234'): { params: Promise<{ orderId: string }> } {
  return { params: Promise.resolve({ orderId }) };
}

describe('POST /api/orders/[orderId]/fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.readDpdProviderSettings.mockResolvedValue(null);
    mocks.readPocztaPolskaProviderSettings.mockResolvedValue(null);
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
  });

  it('stores manual courier tracking and updates order status', async () => {
    mocks.findOne
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder({
        status: 'in-transit',
        shipment: {
          carrier: 'dpd',
          service: 'dpd_courier_standard',
          trackingNumber: 'DPD123',
          trackingUrl: 'https://track.example.test/DPD123',
          status: 'in-transit',
        },
      }));

    const response = await POST(makeRequest({
      status: 'in-transit',
      trackingNumber: 'DPD123',
      trackingUrl: 'https://track.example.test/DPD123',
    }), makeParams());
    const body = await response.json() as { order?: { orderId?: string; shipment?: { trackingNumber?: string } } };

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCD1234' },
      {
        $set: expect.objectContaining({
          status: 'in-transit',
          shipment: expect.objectContaining({
            carrier: 'dpd',
            service: 'dpd_courier_standard',
            trackingNumber: 'DPD123',
            trackingUrl: 'https://track.example.test/DPD123',
            status: 'in-transit',
          }),
        }),
      },
    );
    expect(body.order).toMatchObject({ orderId: 'ARC-2026-ABCD1234', shipment: { trackingNumber: 'DPD123' } });
  });

  it('infers DPD tracking links when only a tracking number is provided', async () => {
    mocks.findOne
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder({
        status: 'in-transit',
        shipment: {
          carrier: 'dpd',
          service: 'dpd_courier_standard',
          trackingNumber: 'DPD123',
          trackingUrl: 'https://tracktrace.dpd.com.pl/parcelDetails?p1=DPD123&typ=1',
          status: 'in-transit',
        },
      }));

    const response = await POST(makeRequest({
      status: 'in-transit',
      trackingNumber: 'DPD123',
    }), makeParams());

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCD1234' },
      {
        $set: expect.objectContaining({
          shipment: expect.objectContaining({
            trackingNumber: 'DPD123',
            trackingUrl: 'https://tracktrace.dpd.com.pl/parcelDetails?p1=DPD123&typ=1',
          }),
        }),
      },
    );
  });

  it('infers DPD tracking links from pushed provider settings', async () => {
    mocks.readDpdProviderSettings.mockResolvedValue({
      accountNumber: '',
      apiUrl: '',
      enabled: true,
      password: '',
      trackingUrlTemplate: 'https://dpd.example.test/track/{trackingNumber}',
      username: '',
    });
    mocks.findOne
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder({
        status: 'in-transit',
        shipment: {
          carrier: 'dpd',
          service: 'dpd_courier_standard',
          trackingNumber: 'DPD123',
          trackingUrl: 'https://dpd.example.test/track/DPD123',
          status: 'in-transit',
        },
      }));

    const response = await POST(makeRequest({
      status: 'in-transit',
      trackingNumber: 'DPD123',
    }), makeParams());

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCD1234' },
      {
        $set: expect.objectContaining({
          shipment: expect.objectContaining({
            trackingUrl: 'https://dpd.example.test/track/DPD123',
          }),
        }),
      },
    );
  });

  it('infers Poczta Polska tracking links when only a tracking number is provided', async () => {
    mocks.findOne
      .mockResolvedValueOnce(makeOrder({
        shippingMethod: 'Poczta Polska',
        shippingCarrier: 'poczta_polska',
        shippingService: 'poczta_polska_tracked',
      }))
      .mockResolvedValueOnce(makeOrder({
        status: 'in-transit',
        shippingMethod: 'Poczta Polska',
        shippingCarrier: 'poczta_polska',
        shippingService: 'poczta_polska_tracked',
        shipment: {
          carrier: 'poczta_polska',
          service: 'poczta_polska_tracked',
          trackingNumber: 'RR123456789PL',
          trackingUrl: 'https://emonitoring.poczta-polska.pl/?numer=RR123456789PL',
          status: 'in-transit',
        },
      }));

    const response = await POST(makeRequest({
      status: 'in-transit',
      trackingNumber: 'RR123456789PL',
    }), makeParams());

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCD1234' },
      {
        $set: expect.objectContaining({
          shipment: expect.objectContaining({
            carrier: 'poczta_polska',
            trackingNumber: 'RR123456789PL',
            trackingUrl: 'https://emonitoring.poczta-polska.pl/?numer=RR123456789PL',
          }),
        }),
      },
    );
  });

  it('allows status-only updates without creating a shipment object', async () => {
    mocks.findOne
      .mockResolvedValueOnce(makeOrder({ shippingCarrier: 'poczta_polska' }))
      .mockResolvedValueOnce(makeOrder({ shippingCarrier: 'poczta_polska', status: 'delivered' }));

    const response = await POST(makeRequest({ status: 'delivered' }), makeParams());

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-ABCD1234' },
      { $set: { status: 'delivered' } },
    );
  });

  it('rejects InPost orders because they use provider fulfillment', async () => {
    mocks.findOne.mockResolvedValueOnce(makeOrder({ shippingCarrier: 'inpost' }));

    const response = await POST(makeRequest({ status: 'in-transit', trackingNumber: 'TRACK123' }), makeParams());

    expect(response.status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('rejects non-admin requests', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await POST(makeRequest({ status: 'in-transit' }), makeParams());

    expect(response.status).toBe(403);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('rejects invalid tracking URLs', async () => {
    mocks.findOne.mockResolvedValueOnce(makeOrder());

    const response = await POST(makeRequest({
      status: 'in-transit',
      trackingNumber: 'DPD123',
      trackingUrl: 'ftp://track.example.test/DPD123',
    }), makeParams());

    expect(response.status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
