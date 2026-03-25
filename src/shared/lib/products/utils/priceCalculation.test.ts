/**
 * @vitest-environment node
 */

import type { PriceGroupForCalculation } from '@/shared/contracts/products';
import { describe, expect, it } from 'vitest';

import { calculatePriceForCurrency, normalizeCurrencyCode } from './priceCalculation';

const createGroup = (overrides: Partial<PriceGroupForCalculation>): PriceGroupForCalculation => ({
  id: 'group-default',
  groupId: 'USD',
  currencyId: 'USD',
  type: 'standard',
  isDefault: false,
  sourceGroupId: null,
  priceMultiplier: 1,
  addToPrice: 0,
  currency: { code: 'USD' },
  currencyCode: 'USD',
  ...overrides,
});

describe('products priceCalculation utils', () => {
  it('normalizes currency codes and returns null when base price or groups are missing', () => {
    expect(normalizeCurrencyCode(' eur ')).toBe('EUR');
    expect(normalizeCurrencyCode(null)).toBe('');
    expect(
      calculatePriceForCurrency(null, null, ' eur ', [createGroup({ isDefault: true })])
    ).toEqual({
      price: null,
      currencyCode: ' eur ',
      baseCurrencyCode: 'EUR',
    });
    expect(calculatePriceForCurrency(10, null, 'usd', [])).toEqual({
      price: null,
      currencyCode: 'usd',
      baseCurrencyCode: 'USD',
    });
  });

  it('returns the base price when the default group already matches the target currency', () => {
    const groups = [
      createGroup({
        id: 'group-usd',
        groupId: 'USD',
        currencyId: 'USD',
        currency: { code: 'usd' },
        currencyCode: 'usd',
        isDefault: true,
      }),
    ];

    expect(calculatePriceForCurrency(100, 'group-usd', 'USD', groups)).toEqual({
      price: 100,
      currencyCode: 'USD',
      baseCurrencyCode: 'USD',
    });
  });

  it('calculates standard and dependent group prices recursively', () => {
    const groups = [
      createGroup({
        id: 'group-usd',
        groupId: 'USD',
        currencyId: 'USD',
        currency: { code: 'USD' },
        currencyCode: 'USD',
        isDefault: true,
      }),
      createGroup({
        id: 'group-eur',
        groupId: 'EUR',
        currencyId: 'EUR',
        currency: { code: 'EUR' },
        currencyCode: 'EUR',
        priceMultiplier: 1.2,
        addToPrice: 5,
      }),
      createGroup({
        id: 'group-gbp',
        groupId: 'GBP',
        currencyId: 'GBP',
        currency: { code: 'GBP' },
        currencyCode: 'GBP',
        type: 'dependent',
        sourceGroupId: 'group-eur',
        priceMultiplier: 2,
        addToPrice: -3,
      }),
    ];

    expect(calculatePriceForCurrency(100, 'group-usd', 'EUR', groups)).toEqual({
      price: 125,
      currencyCode: 'EUR',
      baseCurrencyCode: 'USD',
    });
    expect(calculatePriceForCurrency(100, 'group-usd', 'GBP', groups)).toEqual({
      price: 247,
      currencyCode: 'GBP',
      baseCurrencyCode: 'USD',
    });
  });

  it('falls back to the base currency when the target group cannot be resolved safely', () => {
    const groups = [
      createGroup({
        id: 'group-usd',
        groupId: 'USD',
        currencyId: 'USD',
        currency: { code: 'USD' },
        currencyCode: 'USD',
        isDefault: true,
      }),
      createGroup({
        id: 'group-cycle-a',
        groupId: 'PLN',
        currencyId: 'PLN',
        currency: { code: 'PLN' },
        currencyCode: 'PLN',
        type: 'dependent',
        sourceGroupId: 'group-cycle-b',
      }),
      createGroup({
        id: 'group-cycle-b',
        groupId: 'PLN',
        currencyId: 'PLN',
        currency: { code: 'PLN' },
        currencyCode: 'PLN',
        type: 'dependent',
        sourceGroupId: 'group-cycle-a',
      }),
    ];

    expect(calculatePriceForCurrency(100, 'group-usd', 'PLN', groups)).toEqual({
      price: 100,
      currencyCode: 'USD',
      baseCurrencyCode: 'USD',
    });
    expect(calculatePriceForCurrency(100, 'missing-group', 'CAD', groups)).toEqual({
      price: 100,
      currencyCode: 'USD',
      baseCurrencyCode: 'USD',
    });
  });
});
