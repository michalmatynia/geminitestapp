/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';
import { GET as getMyOrders } from './me/route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrdersForUser: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/orders', () => ({
  getOrdersForUser: mocks.getOrdersForUser,
}));

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('orders API', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getOrdersForUser.mockReset();

    mocks.getSession.mockResolvedValue(null);
    mocks.getOrdersForUser.mockResolvedValue([]);
  });

  it('rejects direct order creation so checkout must use the BLIK payment flow', async () => {
    const response = await POST(makeJsonRequest({ items: [] }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(410);
    expect(body.error).toContain('/api/checkout/blik');
    expect(mocks.getOrdersForUser).not.toHaveBeenCalled();
  });

  it('returns authenticated user order history sorted by the orders helper', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    mocks.getOrdersForUser.mockResolvedValue([
      {
        _id: 'mongo-order-id',
        orderId: 'ARC-2026-1234',
        userId: 'user-1',
        email: 'buyer@example.com',
        status: 'processing',
        items: [],
        shippingMethod: 'Standard',
        shippingPrice: 0,
        shippingAddress: {},
        subtotal: 30,
        discount: 0,
        total: 30,
        createdAt: '2026-05-08T12:00:00.000Z',
      },
    ]);

    const response = await getMyOrders();
    const body = await response.json() as Array<{ _id?: string; orderId?: string }>;

    expect(response.status).toBe(200);
    expect(mocks.getOrdersForUser).toHaveBeenCalledWith('user-1');
    expect(body[0]).toMatchObject({ _id: 'mongo-order-id', orderId: 'ARC-2026-1234' });
  });

  it('requires authentication for order history', async () => {
    const response = await getMyOrders();

    expect(response.status).toBe(401);
    expect(mocks.getOrdersForUser).not.toHaveBeenCalled();
  });
});
