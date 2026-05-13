/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  limit: vi.fn(),
  toArray: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/db-indexes', () => ({
  ensureAppIndexes: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({
      find: mocks.find,
      countDocuments: mocks.countDocuments,
    }),
  })),
}));

function makeRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
  Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
  return request;
}

describe('admin orders API', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.find.mockReset();
    mocks.sort.mockReset();
    mocks.limit.mockReset();
    mocks.toArray.mockReset();
    mocks.countDocuments.mockReset();

    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.find.mockReturnValue({ sort: mocks.sort });
    mocks.sort.mockReturnValue({ limit: mocks.limit });
    mocks.limit.mockReturnValue({ toArray: mocks.toArray });
    mocks.toArray.mockResolvedValue([
      {
        _id: { toString: () => 'mongo-order-id' },
        orderId: 'ARC-2026-ABCD1234',
        email: 'buyer@example.com',
        status: 'processing',
        items: [],
        shippingMethod: 'InPost Parcel Locker',
        shippingPrice: 4,
        shippingCarrier: 'inpost',
        shippingAddress: {},
        subtotal: 30,
        discount: 0,
        total: 34,
        createdAt: '2026-05-08T12:00:00.000Z',
      },
    ]);
    mocks.countDocuments.mockResolvedValue(1);
  });

  it('returns recent orders for super admins', async () => {
    const response = await GET(makeRequest('http://localhost/api/orders/admin?limit=12'));
    const body = await response.json() as { total?: number; orders?: Array<{ _id?: string; orderId?: string }> };

    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith({});
    expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mocks.limit).toHaveBeenCalledWith(12);
    expect(mocks.countDocuments).toHaveBeenCalledWith({});
    expect(body.total).toBe(1);
    expect(body.orders?.[0]).toMatchObject({ _id: 'mongo-order-id', orderId: 'ARC-2026-ABCD1234' });
  });

  it('can filter InPost orders for fulfillment views', async () => {
    const response = await GET(makeRequest('http://localhost/api/orders/admin?carrier=inpost&limit=200'));

    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith({ shippingCarrier: 'inpost' });
    expect(mocks.countDocuments).toHaveBeenCalledWith({ shippingCarrier: 'inpost' });
    expect(mocks.limit).toHaveBeenCalledWith(100);
  });

  it('can filter courier orders by carrier', async () => {
    const response = await GET(makeRequest('http://localhost/api/orders/admin?carrier=dpd&limit=50'));

    expect(response.status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith({ shippingCarrier: 'dpd' });
    expect(mocks.countDocuments).toHaveBeenCalledWith({ shippingCarrier: 'dpd' });
    expect(mocks.limit).toHaveBeenCalledWith(50);
  });

  it('rejects non-admin access before querying orders', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await GET(makeRequest('http://localhost/api/orders/admin'));

    expect(response.status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.countDocuments).not.toHaveBeenCalled();
  });
});
