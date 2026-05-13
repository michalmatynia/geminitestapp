/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getMentiosProducts: vi.fn(),
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
}));

vi.mock('@/lib/mentios', () => ({ getMentiosProducts: mocks.getMentiosProducts }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { GET } from './route';

function makeReq(search = ''): NextRequest {
  const url = `http://localhost/api/products${search ? `?${search}` : ''}`;
  const req = new Request(url) as NextRequest;
  Object.defineProperty(req, 'nextUrl', { value: new URL(url) });
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
  // Default: DB returns nothing → falls through to static
  mocks.getMentiosProducts.mockResolvedValue({ products: [], total: 0 });
});

describe('GET /api/products', () => {
  it('falls back to static products when DB returns empty', async () => {
    const res = await GET(makeReq());
    const body = await res.json() as { products: unknown[]; source: string };
    expect(res.status).toBe(200);
    expect(body.source).toBe('static');
    expect(Array.isArray(body.products)).toBe(true);
  });

  it('returns mentios products when DB has results', async () => {
    const fakeProduct = { id: 'p1', name: 'Stargater Pin', price: 15 };
    mocks.getMentiosProducts.mockResolvedValue({ products: [fakeProduct], total: 1 });
    const res = await GET(makeReq());
    const body = await res.json() as { products: unknown[]; source: string; total: number };
    expect(body.source).toBe('mentios');
    expect(body.total).toBe(1);
    expect(body.products[0]).toEqual(fakeProduct);
  });

  it('returns an empty mentios page instead of static products when pagination is past the DB total', async () => {
    mocks.getMentiosProducts.mockResolvedValue({ products: [], total: 12 });
    const res = await GET(makeReq('skip=200'));
    const body = await res.json() as { products: unknown[]; source: string; total: number };
    expect(body.source).toBe('mentios');
    expect(body.total).toBe(12);
    expect(body.products).toEqual([]);
  });

  it('returns filtered mentios empties instead of static products', async () => {
    mocks.getMentiosProducts.mockResolvedValue({ products: [], total: 0 });
    const res = await GET(makeReq('priceMin=99999'));
    const body = await res.json() as { products: unknown[]; source: string; total: number };
    expect(body.source).toBe('mentios');
    expect(body.total).toBe(0);
    expect(body.products).toEqual([]);
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 60 });
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('passes collection filter to getMentiosProducts', async () => {
    await GET(makeReq('collection=arcana'));
    expect(mocks.getMentiosProducts).toHaveBeenCalledWith(
      expect.objectContaining({ collectionSlug: 'arcana' }),
    );
  });

  it('filters static products by collection when DB is empty', async () => {
    const res = await GET(makeReq('collection=non-existent-collection-xyz'));
    const body = await res.json() as { products: unknown[] };
    expect(body.products).toHaveLength(0);
  });

  it('passes price range to getMentiosProducts', async () => {
    await GET(makeReq('priceMin=10&priceMax=50'));
    expect(mocks.getMentiosProducts).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: 10, priceMax: 50 }),
    );
  });

  it('respects limit cap of 200', async () => {
    await GET(makeReq('limit=9999'));
    expect(mocks.getMentiosProducts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200 }),
    );
  });

  it('sorts static fallback products by price ascending', async () => {
    const res = await GET(makeReq('sort=price-asc'));
    const body = await res.json() as { products: Array<{ price: number }> };
    const prices = body.products.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
