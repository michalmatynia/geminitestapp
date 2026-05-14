/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrdersForUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/orders', () => ({ getOrdersForUser: mocks.getOrdersForUser }));

import { GET } from './route';

const MOCK_USER = { id: 'user-123', email: 'test@example.com', name: 'Test User', role: 'customer' };
const MOCK_ORDERS = [
  { orderId: 'ARC-2026-AABBCCDD', status: 'processing', total: 9900 },
  { orderId: 'ARC-2026-EEFF0011', status: 'delivered', total: 4950 },
];

describe('GET /api/orders/me', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getOrdersForUser.mockReset();
    mocks.getSession.mockResolvedValue(MOCK_USER);
    mocks.getOrdersForUser.mockResolvedValue(MOCK_ORDERS);
  });

  it('returns the authenticated user orders', async () => {
    const res = await GET();
    const body = await res.json() as typeof MOCK_ORDERS;

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0]?.orderId).toBe('ARC-2026-AABBCCDD');
    expect(mocks.getOrdersForUser).toHaveBeenCalledWith('user-123');
  });

  it('returns 401 when the user is not authenticated', async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mocks.getOrdersForUser).not.toHaveBeenCalled();
  });

  it('returns an empty array when the user has no orders', async () => {
    mocks.getOrdersForUser.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json() as unknown[];

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});
