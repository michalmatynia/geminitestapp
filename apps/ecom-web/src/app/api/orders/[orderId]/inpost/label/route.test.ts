/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOne: vi.fn(),
  downloadInpostLabel: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ findOne: mocks.findOne }),
  })),
}));

vi.mock('@/lib/inpost', () => ({
  downloadInpostLabel: mocks.downloadInpostLabel,
}));

function makeRequest(url = 'http://localhost/api/orders/ARC-2026-ABCD1234/inpost/label?format=A6'): NextRequest {
  const request = new Request(url) as NextRequest;
  Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
  return request;
}

function makeParams(orderId = 'ARC-2026-ABCD1234'): { params: Promise<{ orderId: string }> } {
  return { params: Promise.resolve({ orderId }) };
}

function makeOrderDoc() {
  return {
    _id: { toString: () => 'mongo-order-id' },
    orderId: 'ARC-2026-ABCD1234',
    email: 'buyer@example.com',
    status: 'processing',
    items: [],
    shippingMethod: 'InPost Parcel Locker',
    shippingPrice: 4,
    shippingCarrier: 'inpost',
    inpostShipment: {
      trackingNumber: 'TRACK123',
    },
    shippingAddress: {},
    subtotal: 30,
    discount: 0,
    total: 34,
    createdAt: '2026-05-08T12:00:00.000Z',
  };
}

describe('InPost label route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.findOne.mockReset();
    mocks.downloadInpostLabel.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.findOne.mockResolvedValue(makeOrderDoc());
    mocks.downloadInpostLabel.mockResolvedValue({
      bytes: Buffer.from('%PDF-label'),
      contentType: 'application/pdf',
    });
  });

  it('rejects non-admin requests before loading the order', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(403);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.downloadInpostLabel).not.toHaveBeenCalled();
  });

  it('downloads an A6 label for an InPost order with tracking', async () => {
    const response = await GET(makeRequest(), makeParams());
    const body = Buffer.from(await response.arrayBuffer()).toString('utf8');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('ARC-2026-ABCD1234-inpost-label-A6.pdf');
    expect(body).toBe('%PDF-label');
    expect(mocks.downloadInpostLabel).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'ARC-2026-ABCD1234' }),
      'application/pdf;format=A6',
    );
  });

  it('supports A4 label format', async () => {
    const response = await GET(
      makeRequest('http://localhost/api/orders/ARC-2026-ABCD1234/inpost/label?format=A4'),
      makeParams(),
    );

    expect(response.status).toBe(200);
    expect(mocks.downloadInpostLabel).toHaveBeenCalledWith(
      expect.any(Object),
      'application/pdf;format=A4',
    );
  });

  it('returns 400 when tracking is missing', async () => {
    mocks.findOne.mockResolvedValue({
      ...makeOrderDoc(),
      inpostShipment: {},
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(400);
    expect(mocks.downloadInpostLabel).not.toHaveBeenCalled();
  });

  it('surfaces label download failures as 502', async () => {
    mocks.downloadInpostLabel.mockRejectedValue(new Error('Label unavailable'));

    const response = await GET(makeRequest(), makeParams());
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe('Label unavailable');
  });
});
