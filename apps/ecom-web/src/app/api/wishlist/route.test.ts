/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
  ensureAppIndexes: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db-indexes', () => ({ ensureAppIndexes: mocks.ensureAppIndexes }));
vi.mock('@/lib/mongodb', () => ({
  getEcomAuthDb: vi.fn(async () => ({
    collection: () => ({
      findOne: mocks.findOne,
      updateOne: mocks.updateOne,
    }),
  })),
}));

import { GET, POST } from './route';

function jsonReq(body: unknown): NextRequest {
  return new Request('http://localhost/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

const validItem = {
  productId: 'prod-1',
  slug: 'arcana-pin',
  name: 'Arcana Pin',
  category: 'Pins',
  price: 15,
  priceDisplay: '€ 15',
  gradient: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureAppIndexes.mockResolvedValue(undefined);
});

describe('GET /api/wishlist', () => {
  it('returns empty items when not signed in', async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await GET();
    const body = await res.json() as { items: unknown[] };
    expect(res.status).toBe(200);
    expect(body.items).toEqual([]);
  });

  it('returns stored items for logged-in user', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    mocks.findOne.mockResolvedValue({ items: [validItem] });
    const res = await GET();
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });

  it('returns empty array when user has no wishlist document', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-2' });
    mocks.findOne.mockResolvedValue(null);
    const res = await GET();
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toEqual([]);
  });
});

describe('POST /api/wishlist', () => {
  it('returns 401 for unauthenticated user', async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await POST(jsonReq({ items: [validItem] }));
    expect(res.status).toBe(401);
  });

  it('saves a valid wishlist and returns ok', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    mocks.updateOne.mockResolvedValue({});
    const res = await POST(jsonReq({ items: [validItem] }));
    const body = await res.json() as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.updateOne).toHaveBeenCalled();
  });

  it('returns 400 when items field is missing', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when items is not an array', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    const res = await POST(jsonReq({ items: 'not-an-array' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an item missing required fields', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    const res = await POST(jsonReq({ items: [{ name: 'Only Name' }] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when wishlist exceeds 200 items', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    const oversized = Array.from({ length: 201 }, () => validItem);
    const res = await POST(jsonReq({ items: oversized }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1' });
    const req = new Request('http://localhost/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad-json',
    }) as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
