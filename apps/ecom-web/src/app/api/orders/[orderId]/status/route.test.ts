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
    mocks.findOne.mockResolvedValue({ status: 'processing' });

    const res = await GET(makeRequest('ARC-2026-ABCD1234'), makeParams('ARC-2026-ABCD1234'));
    const body = await res.json() as { status: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe('processing');
  });

  it('returns 404 for an unknown order', async () => {
    mocks.findOne.mockResolvedValue(null);

    const res = await GET(makeRequest('ARC-UNKNOWN'), makeParams('ARC-UNKNOWN'));

    expect(res.status).toBe(404);
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false });

    const res = await GET(makeRequest('ARC-2026-ABCD1234'), makeParams('ARC-2026-ABCD1234'));

    expect(res.status).toBe(429);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('queries only the orderId field from MongoDB', async () => {
    mocks.findOne.mockResolvedValue({ status: 'pending_payment' });

    await GET(makeRequest('ARC-2026-XYZ'), makeParams('ARC-2026-XYZ'));

    expect(mocks.findOne).toHaveBeenCalledWith(
      { orderId: 'ARC-2026-XYZ' },
      { projection: { status: 1 } },
    );
  });
});
