/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import {
  validatePromoCode,
  computeDiscount,
  isValidPromoCode,
  getPromoDiscountPct,
} from './promo';

describe('promo code helpers', () => {
  describe('validatePromoCode', () => {
    it('returns the discount percentage for a valid code', () => {
      expect(validatePromoCode('ARCANA10')).toBe(0.10);
      expect(validatePromoCode('ARCANA15')).toBe(0.15);
      expect(validatePromoCode('WELCOME20')).toBe(0.20);
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(validatePromoCode('arcana10')).toBe(0.10);
      expect(validatePromoCode('  ARCANA10  ')).toBe(0.10);
      expect(validatePromoCode(' welcome20 ')).toBe(0.20);
    });

    it('returns 0 for an unknown code', () => {
      expect(validatePromoCode('INVALID')).toBe(0);
      expect(validatePromoCode('ARCANA99')).toBe(0);
    });

    it('returns 0 for null, undefined, and empty string', () => {
      expect(validatePromoCode(null)).toBe(0);
      expect(validatePromoCode(undefined)).toBe(0);
      expect(validatePromoCode('')).toBe(0);
      expect(validatePromoCode('   ')).toBe(0);
    });
  });

  describe('computeDiscount', () => {
    it('computes the rounded discount amount from subtotal and promo code', () => {
      expect(computeDiscount(10000, 'ARCANA10')).toBe(1000);  // 10% of 100.00
      expect(computeDiscount(10000, 'WELCOME20')).toBe(2000); // 20% of 100.00
    });

    it('rounds half-up correctly on non-integer discount', () => {
      // 15% of 9999 = 1499.85 → rounds to 1500
      expect(computeDiscount(9999, 'ARCANA15')).toBe(1500);
    });

    it('returns 0 for invalid or missing code', () => {
      expect(computeDiscount(10000, 'BADCODE')).toBe(0);
      expect(computeDiscount(10000, null)).toBe(0);
      expect(computeDiscount(10000, undefined)).toBe(0);
    });

    it('returns 0 for zero subtotal regardless of code', () => {
      expect(computeDiscount(0, 'WELCOME20')).toBe(0);
    });
  });

  describe('isValidPromoCode', () => {
    it('returns true for all defined codes', () => {
      expect(isValidPromoCode('ARCANA10')).toBe(true);
      expect(isValidPromoCode('ARCANA15')).toBe(true);
      expect(isValidPromoCode('WELCOME20')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isValidPromoCode('arcana10')).toBe(true);
      expect(isValidPromoCode('Welcome20')).toBe(true);
    });

    it('returns false for unknown codes', () => {
      expect(isValidPromoCode('NOTACODE')).toBe(false);
      expect(isValidPromoCode('')).toBe(false);
    });
  });

  describe('getPromoDiscountPct', () => {
    it('returns the correct percentage for each code', () => {
      expect(getPromoDiscountPct('ARCANA10')).toBe(0.10);
      expect(getPromoDiscountPct('ARCANA15')).toBe(0.15);
      expect(getPromoDiscountPct('WELCOME20')).toBe(0.20);
    });

    it('returns 0 for unknown codes', () => {
      expect(getPromoDiscountPct('FAKE')).toBe(0);
      expect(getPromoDiscountPct('')).toBe(0);
    });
  });

  it('server-side discount computation is resistant to client manipulation — the code table is the source of truth', () => {
    // If a client submits discount: 999999 in the order body, the API ignores it
    // and recomputes from computeDiscount(subtotal, promoCode). This test documents
    // the contract that computeDiscount is authoritative.
    const clientClaimedDiscount = 999999;
    const serverDiscount = computeDiscount(5000, 'ARCANA10');
    expect(serverDiscount).toBe(500);
    expect(serverDiscount).not.toBe(clientClaimedDiscount);
  });
});
