/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  validatePromoCode,
  computeDiscount,
  isValidPromoCode,
  getPromoDiscountPct,
} from './promo';

const mocks = vi.hoisted(() => ({
  getEcommerceProductsDb: vi.fn(),
  getDb: vi.fn(),
  getRedisConnection: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: mocks.getDb,
  getEcommerceProductsDb: mocks.getEcommerceProductsDb,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: mocks.getRedisConnection,
}));

describe('promo code helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getRedisConnection.mockReturnValue(null);
  });

  describe('validatePromoCode', () => {
    it('returns the discount percentage for a valid code', async () => {
      expect(await validatePromoCode('ARCANA10')).toBe(0.10);
      expect(await validatePromoCode('ARCANA15')).toBe(0.15);
      expect(await validatePromoCode('WELCOME20')).toBe(0.20);
    });

    it('is case-insensitive and trims whitespace', async () => {
      expect(await validatePromoCode('arcana10')).toBe(0.10);
      expect(await validatePromoCode('  ARCANA10  ')).toBe(0.10);
      expect(await validatePromoCode(' welcome20 ')).toBe(0.20);
    });

    it('returns 0 for an unknown code', async () => {
      expect(await validatePromoCode('INVALID')).toBe(0);
      expect(await validatePromoCode('ARCANA99')).toBe(0);
    });

    it('returns 0 for null, undefined, and empty string', async () => {
      expect(await validatePromoCode(null)).toBe(0);
      expect(await validatePromoCode(undefined)).toBe(0);
      expect(await validatePromoCode('')).toBe(0);
      expect(await validatePromoCode('   ')).toBe(0);
    });
  });

  describe('computeDiscount', () => {
    it('computes the rounded discount amount from subtotal and promo code', async () => {
      expect(await computeDiscount(10000, 'ARCANA10')).toBe(1000);  // 10% of 100.00
      expect(await computeDiscount(10000, 'WELCOME20')).toBe(2000); // 20% of 100.00
    });

    it('preserves cents on fractional percentage discounts', async () => {
      expect(await computeDiscount(9999, 'ARCANA15')).toBe(1499.85);
      expect(await computeDiscount(19.04, 'ARCANA10')).toBe(1.9);
      expect(await computeDiscount(19.04, 'WELCOME20')).toBe(3.81);
    });

    it('returns 0 for invalid or missing code', async () => {
      expect(await computeDiscount(10000, 'BADCODE')).toBe(0);
      expect(await computeDiscount(10000, null)).toBe(0);
      expect(await computeDiscount(10000, undefined)).toBe(0);
    });

  it('returns 0 for zero subtotal regardless of code', async () => {
    expect(await computeDiscount(0, 'WELCOME20')).toBe(0);
  });

  it('uses Redis coupon payload when available before MongoDB', async () => {
    const redisClient = {
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          code: 'REDIS10',
          enabled: true,
          discountType: 'percentage',
          value: 10,
          startsAt: null,
          endsAt: null,
        })
      ),
    };
    mocks.getRedisConnection.mockReturnValue(redisClient);

    expect(await computeDiscount(10000, 'REDIS10')).toBe(1000);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.getEcommerceProductsDb).not.toHaveBeenCalled();
  });

  it('falls back to MongoDB when Redis cache is missing', async () => {
    const redisClient = {
      get: vi.fn().mockResolvedValue(null),
    };
    const ecommerceDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_discounts') {
          return {
            findOne: vi.fn().mockResolvedValue({
              code: 'MONGO10',
              enabled: true,
              discountType: 'percentage',
              value: 10,
            }),
          };
        }
        return null;
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return { findOne: vi.fn(), countDocuments: vi.fn() };
        return null;
      }),
    };

    mocks.getRedisConnection.mockReturnValue(redisClient);
    mocks.getEcommerceProductsDb.mockResolvedValue(ecommerceDb);
    mocks.getDb.mockResolvedValue(ordersDb);

    expect(await computeDiscount(10000, 'MONGO10')).toBe(1000);
    expect(mocks.getEcommerceProductsDb).toHaveBeenCalledTimes(1);
  });

  it('falls back to MongoDB when Redis payload is invalid', async () => {
    const redisClient = {
      get: vi.fn().mockResolvedValue('not-json'),
    };
    const ecommerceDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_discounts') {
          return {
            findOne: vi.fn().mockResolvedValue({
              code: 'INVALID',
              enabled: true,
              discountType: 'percentage',
              value: 10,
            }),
          };
        }
        return null;
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return { findOne: vi.fn(), countDocuments: vi.fn() };
        return null;
      }),
    };

    mocks.getRedisConnection.mockReturnValue(redisClient);
    mocks.getEcommerceProductsDb.mockResolvedValue(ecommerceDb);
    mocks.getDb.mockResolvedValue(ordersDb);

    expect(await computeDiscount(10000, 'INVALID')).toBe(1000);
    expect(mocks.getEcommerceProductsDb).toHaveBeenCalledTimes(1);
  });

  it('validates a database-backed fixed discount code with minimum order constraint', async () => {
    const promoCollection = {
      findOne: vi.fn().mockResolvedValue({
        code: 'FIXED15',
        enabled: true,
        discountType: 'fixed',
        value: 1500,
        minOrderAmount: 2500,
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return { findOne: vi.fn(), countDocuments: vi.fn() };
        return null;
      }),
    };
    const ecommerceDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_discounts') return promoCollection;
        return null;
      }),
    };

    mocks.getEcommerceProductsDb.mockResolvedValue(ecommerceDb);
    mocks.getDb.mockResolvedValue(ordersDb);

    expect(await computeDiscount(2000, 'FIXED15', 'alice@example.com')).toBe(0);
    expect(await computeDiscount(3000, 'FIXED15', 'alice@example.com')).toBe(1500);
  });

  it('preserves cents for database-backed fixed discount codes', async () => {
    const promoCollection = {
      findOne: vi.fn().mockResolvedValue({
        code: 'FIXED150',
        enabled: true,
        discountType: 'fixed',
        value: 1.5,
        minOrderAmount: 10,
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return { findOne: vi.fn(), countDocuments: vi.fn() };
        return null;
      }),
    };
    const ecommerceDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_discounts') return promoCollection;
        return null;
      }),
    };

    mocks.getEcommerceProductsDb.mockResolvedValue(ecommerceDb);
    mocks.getDb.mockResolvedValue(ordersDb);

    expect(await computeDiscount(19.04, 'FIXED150', 'alice@example.com')).toBe(1.5);
  });

  it('respects coupon start and end date boundaries', async () => {
    const now = new Date();
    const activeFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const expired = new Date(now.getTime() - 60 * 1000).toISOString();
    const future = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const promoCollection = {
      findOne: vi.fn().mockImplementation(async ({ code }: { code: string }) => {
        if (code !== 'TIMED10') return null;
        return {
          code: 'TIMED10',
          enabled: true,
          discountType: 'percentage',
          value: 10,
          startsAt: activeFrom,
          endsAt: future,
        };
      }),
    };
    const inactivePromoCollection = {
      findOne: vi.fn().mockResolvedValue({
        code: 'TIMED10',
        enabled: true,
        discountType: 'percentage',
        value: 10,
        startsAt: now.toISOString(),
        endsAt: expired,
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return { findOne: vi.fn(), countDocuments: vi.fn() };
        return null;
      }),
    };

    mocks.getEcommerceProductsDb
      .mockResolvedValueOnce({ collection: (name: string) => {
        if (name === 'ecom_discounts') return promoCollection;
        return null;
      } })
      .mockResolvedValueOnce({ collection: (name: string) => {
        if (name === 'ecom_discounts') return inactivePromoCollection;
        return null;
      } });
    mocks.getDb.mockResolvedValue(ordersDb);

    expect(await isValidPromoCode('TIMED10', 10000, 'alice@example.com')).toBe(true);
    expect(await isValidPromoCode('TIMED10', 10000, 'alice@example.com')).toBe(false);
  });
  });

  describe('isValidPromoCode', () => {
    it('returns true for all defined codes', async () => {
      expect(await isValidPromoCode('ARCANA10')).toBe(true);
      expect(await isValidPromoCode('ARCANA15')).toBe(true);
      expect(await isValidPromoCode('WELCOME20')).toBe(true);
    });

    it('is case-insensitive', async () => {
      expect(await isValidPromoCode('arcana10')).toBe(true);
      expect(await isValidPromoCode('Welcome20')).toBe(true);
    });

    it('returns false for unknown codes', async () => {
      expect(await isValidPromoCode('NOTACODE')).toBe(false);
      expect(await isValidPromoCode('')).toBe(false);
    });
  });

  describe('getPromoDiscountPct', () => {
    it('returns the correct percentage for each code', async () => {
      expect(await getPromoDiscountPct('ARCANA10')).toBe(0.10);
      expect(await getPromoDiscountPct('ARCANA15')).toBe(0.15);
      expect(await getPromoDiscountPct('WELCOME20')).toBe(0.20);
    });

    it('returns 0 for unknown codes', async () => {
      expect(await getPromoDiscountPct('FAKE')).toBe(0);
      expect(await getPromoDiscountPct('')).toBe(0);
    });
  });

  it('server-side discount computation is resistant to client manipulation — the code table is the source of truth', async () => {
    // If a client submits discount: 999999 in the order body, the API ignores it
    // and recomputes from computeDiscount(subtotal, promoCode). This test documents
    // the contract that computeDiscount is authoritative.
    const clientClaimedDiscount = 999999;
    const serverDiscount = await computeDiscount(5000, 'ARCANA10');
    expect(serverDiscount).toBe(500);
    expect(serverDiscount).not.toBe(clientClaimedDiscount);
  });

  it('blocks single-use coupons when the same email already used the code', async () => {
    const promoCollection = {
      findOne: vi.fn().mockResolvedValue({
        code: 'ARCANA10',
        enabled: true,
        discountType: 'percentage',
        value: 10,
        singleUse: true,
      }),
    };
    const orderCollection = {
      findOne: vi.fn().mockResolvedValue({
        _id: 'order-1',
        promoCode: 'ARCANA10',
        email: 'alice@example.com',
        status: 'processing',
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    };
    const ecommerceDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_discounts') return promoCollection;
        return null;
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return orderCollection;
        return null;
      }),
    };

    mocks.getEcommerceProductsDb.mockResolvedValue(ecommerceDb);
    mocks.getDb.mockResolvedValue(ordersDb);

    const valid = await isValidPromoCode('ARCANA10', 10000, 'Alice@Example.Com');

    expect(valid).toBe(false);
    expect(orderCollection.findOne).toHaveBeenCalledWith({
      promoCode: 'ARCANA10',
      email: 'alice@example.com',
      status: { $ne: 'cancelled' },
    });
  });

  it('blocks coupons when usage limit has been reached', async () => {
    const promoCollection = {
      findOne: vi.fn().mockResolvedValue({
        code: 'ARCANA10',
        enabled: true,
        discountType: 'percentage',
        value: 10,
        usageLimit: 2,
      }),
    };
    const orderCollection = {
      countDocuments: vi.fn().mockResolvedValue(2),
    };
    const ecommerceDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_discounts') return promoCollection;
        return null;
      }),
    };
    const ordersDb = {
      collection: vi.fn((name: string) => {
        if (name === 'ecom_orders') return orderCollection;
        return null;
      }),
    };

    mocks.getEcommerceProductsDb.mockResolvedValue(ecommerceDb);
    mocks.getDb.mockResolvedValue(ordersDb);

    const amount = await computeDiscount(10000, 'ARCANA10', 'ALICE@EXAMPLE.COM');

    expect(amount).toBe(0);
    expect(orderCollection.countDocuments).toHaveBeenCalledWith({
      promoCode: 'ARCANA10',
      status: { $ne: 'cancelled' },
    });
  });
});
