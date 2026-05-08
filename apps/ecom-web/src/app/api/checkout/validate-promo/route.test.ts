/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { POST } from './route';

function jsonReq(body: unknown): NextRequest {
  return new Request('http://localhost/api/checkout/validate-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
});

describe('POST /api/checkout/validate-promo', () => {
  it('returns valid:true with discount percentage for a known code', async () => {
    const res = await POST(jsonReq({ code: 'ARCANA10' }));
    const body = await res.json() as { valid: boolean; discountPct?: number };
    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.discountPct).toBe(0.10);
  });

  it('is case-insensitive', async () => {
    const res = await POST(jsonReq({ code: 'welcome20' }));
    const body = await res.json() as { valid: boolean; discountPct?: number };
    expect(body.valid).toBe(true);
    expect(body.discountPct).toBe(0.20);
  });

  it('returns valid:false for an unknown code', async () => {
    const res = await POST(jsonReq({ code: 'NOTACODE' }));
    const body = await res.json() as { valid: boolean };
    expect(res.status).toBe(200);
    expect(body.valid).toBe(false);
    expect(body).not.toHaveProperty('discountPct');
  });

  it('returns valid:false for empty code', async () => {
    const res = await POST(jsonReq({ code: '' }));
    const body = await res.json() as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it('returns valid:false when code field is missing', async () => {
    const res = await POST(jsonReq({}));
    const body = await res.json() as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 60 });
    const res = await POST(jsonReq({ code: 'ARCANA10' }));
    expect(res.status).toBe(429);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/checkout/validate-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
