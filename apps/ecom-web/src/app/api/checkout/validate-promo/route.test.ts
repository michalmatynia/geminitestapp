/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import * as promoLib from '@/lib/promo';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { POST } from './route';

const mockPromoLookup = (
  evaluation: Awaited<ReturnType<typeof promoLib.lookupPromoDiscount>>
): void => {
  vi.mocked(promoLib.lookupPromoDiscount).mockResolvedValue(evaluation);
};

function jsonReq(body: unknown): NextRequest {
  return new Request('http://localhost/api/checkout/validate-promo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
  vi.spyOn(promoLib, 'lookupPromoDiscount').mockResolvedValue(null);
});

describe('POST /api/checkout/validate-promo', () => {
  it('returns fixed discount details when provided by the resolver', async () => {
    mockPromoLookup({
      discountType: 'fixed',
      discountValue: 1500,
      discountAmount: 1500,
      discountPct: 0.25,
    });

    const res = await POST(jsonReq({ code: 'FIXED15', subtotal: 10000 }));
    const body = await res.json() as {
      valid: boolean;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      discountPct?: number;
    };

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.discountType).toBe('fixed');
    expect(body.discountValue).toBe(1500);
    expect(body.discountPct).toBe(0.25);
    expect(promoLib.lookupPromoDiscount).toHaveBeenCalledWith('FIXED15', 10000, null);
  });

  it('returns valid:true with discount percentage for a known code', async () => {
    mockPromoLookup({
      discountType: 'percentage',
      discountValue: 0.10,
      discountAmount: 1000,
      discountPct: 0.10,
    });

    const res = await POST(jsonReq({ code: 'ARCANA10', subtotal: 10000 }));
    const body = await res.json() as { valid: boolean; discountPct?: number };
    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.discountPct).toBe(0.10);
  });

  it('is case-insensitive', async () => {
    mockPromoLookup({
      discountType: 'percentage',
      discountValue: 0.20,
      discountAmount: 2000,
      discountPct: 0.20,
    });

    const res = await POST(jsonReq({ code: 'welcome20', subtotal: 10000 }));
    const body = await res.json() as { valid: boolean; discountPct?: number };
    expect(body.valid).toBe(true);
    expect(body.discountPct).toBe(0.20);
  });

  it('accepts codes with whitespace by normalizing it before lookup', async () => {
    mockPromoLookup({
      discountType: 'percentage',
      discountValue: 0.15,
      discountAmount: 1500,
      discountPct: 0.15,
    });

    const res = await POST(jsonReq({ code: '  arca na15  ', subtotal: 10000 }));
    const body = await res.json() as { valid: boolean; discountType?: string; discountValue?: number };

    expect(body.valid).toBe(true);
    expect(body.discountType).toBe('percentage');
    expect(body.discountValue).toBe(0.15);
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
