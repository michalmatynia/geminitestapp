/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CheckoutShippingMethodContent, ShippingZone } from '@/data/checkoutContent';
import { applyFreeThreshold, calcDeliveryRange, getZoneForCountry } from './shipping';

const standardMethod: CheckoutShippingMethodContent = {
  id: 'standard',
  label: 'Standard',
  detail: '3-5 business days',
  price: 15,
  priceLabel: '€ 15',
  businessDaysMin: 3,
  businessDaysMax: 5,
};

const expressMethod: CheckoutShippingMethodContent = {
  id: 'express',
  label: 'Express',
  detail: '2-3 business days',
  price: 35,
  priceLabel: '€ 35',
  businessDaysMin: 2,
  businessDaysMax: 3,
};

const zones: ShippingZone[] = [
  {
    id: 'eu',
    label: 'European Union',
    countries: ['France', 'Germany'],
    methods: [{ ...standardMethod, price: 0, priceLabel: 'Free' }],
  },
  {
    id: 'international',
    label: 'International',
    countries: [],
    methods: [standardMethod, expressMethod],
  },
];

describe('shipping helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches countries case-insensitively and uses the empty country list as catch-all', () => {
    expect(getZoneForCountry(zones, ' france ')?.id).toBe('eu');
    expect(getZoneForCountry(zones, 'United Kingdom')?.id).toBe('international');
  });

  it('returns null for an empty country so checkout can use fallback methods before selection', () => {
    expect(getZoneForCountry(zones, '')).toBeNull();
    expect(getZoneForCountry(zones, '   ')).toBeNull();
  });

  it('applies the free threshold to the configured method without mutating input methods', () => {
    const methods = [standardMethod, expressMethod];
    const discounted = applyFreeThreshold(methods, 60, 60, 'standard');

    expect(discounted).toEqual([
      { ...standardMethod, price: 0 },
      expressMethod,
    ]);
    expect(methods[0].price).toBe(15);
  });

  it('leaves methods unchanged when the threshold is disabled or not met', () => {
    const methods = [standardMethod, expressMethod];

    expect(applyFreeThreshold(methods, 59, 60, 'standard')).toBe(methods);
    expect(applyFreeThreshold(methods, 100, 0, 'standard')).toBe(methods);
  });

  it('calculates delivery estimates using business days and localized date formats', () => {
    expect(calcDeliveryRange(1, 1, 'en')).toBe('Mon 11 May');
    expect(calcDeliveryRange(3, 5, 'en')).toBe('13-15 May');
    expect(calcDeliveryRange(1, 1, 'pl')).toBe('pon., 11 maj');
  });
});
