/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHECKOUT_CONTENT_DEFAULTS, type CheckoutShippingMethodContent, type ShippingZone } from '@/data/checkoutContent';
import {
  applyFreeThreshold,
  calcDeliveryRange,
  filterShippingMethodsForCountry,
  filterShippingMethodsForProviderAvailability,
  getZoneForCountry,
  isPolandShippingCountry,
  resolveCheckoutShippingSelection,
} from './shipping';

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

const inpostLockerMethod: CheckoutShippingMethodContent = {
  id: 'inpost-locker',
  label: 'InPost Parcel Locker',
  detail: 'Pickup at selected parcel locker',
  price: 4,
  priceLabel: '€ 4',
  businessDaysMin: 1,
  businessDaysMax: 2,
  carrier: 'inpost',
  service: 'inpost_locker_standard',
  requiresPickupPoint: true,
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

  it('keeps InPost shipping available for Poland checkout addresses', () => {
    const methods = [standardMethod, inpostLockerMethod, expressMethod];

    expect(isPolandShippingCountry(' Poland ')).toBe(true);
    expect(isPolandShippingCountry('PL')).toBe(true);
    expect(isPolandShippingCountry('Polska')).toBe(true);
    expect(filterShippingMethodsForCountry(methods, 'Poland')).toBe(methods);
  });

  it('removes InPost shipping outside Poland even when CMS methods include it', () => {
    const methods = [standardMethod, inpostLockerMethod, expressMethod];

    expect(isPolandShippingCountry('France')).toBe(false);
    expect(filterShippingMethodsForCountry(methods, 'France')).toEqual([standardMethod, expressMethod]);
    expect(filterShippingMethodsForCountry(methods, '')).toEqual([standardMethod, expressMethod]);
  });

  it('removes shipping methods disabled by provider settings', () => {
    const methods = [standardMethod, inpostLockerMethod, expressMethod];

    expect(filterShippingMethodsForProviderAvailability(methods, { inpost: false })).toEqual([
      standardMethod,
      expressMethod,
    ]);
  });

  it('keeps checkout usable when provider settings would remove every method', () => {
    const domesticMethods = CHECKOUT_CONTENT_DEFAULTS.shippingZones[0].methods;

    expect(filterShippingMethodsForProviderAvailability(domesticMethods, {
      dpd: false,
      inpost: false,
      poczta_polska: false,
    })).toBe(domesticMethods);
  });

  it('calculates delivery estimates using business days and localized date formats', () => {
    expect(calcDeliveryRange(1, 1, 'en')).toBe('Mon 11 May');
    expect(calcDeliveryRange(3, 5, 'en')).toBe('13-15 May');
    expect(calcDeliveryRange(1, 1, 'pl')).toBe('pon., 11 maj');
  });

  it('resolves a valid checkout shipping selection to canonical method metadata', () => {
    const result = resolveCheckoutShippingSelection({
      content: CHECKOUT_CONTENT_DEFAULTS,
      country: 'Poland',
      subtotal: 1500,
      methodId: 'dpd-courier',
      methodLabel: 'Manipulated label',
      service: 'dpd_courier_standard',
      carrier: 'dpd',
      price: 10,
      inpostPoint: null,
    });

    expect(result).toEqual({
      ok: true,
      selection: expect.objectContaining({
        shippingMethod: 'DPD Courier',
        shippingPrice: 10,
        shippingCarrier: 'dpd',
        shippingService: 'dpd_courier_standard',
      }),
    });
  });

  it('rejects shipping prices that do not match the configured method', () => {
    const result = resolveCheckoutShippingSelection({
      content: CHECKOUT_CONTENT_DEFAULTS,
      country: 'Poland',
      subtotal: 1500,
      methodId: 'dpd-courier',
      methodLabel: 'DPD Courier',
      service: 'dpd_courier_standard',
      carrier: 'dpd',
      price: 0,
      inpostPoint: null,
    });

    expect(result).toEqual({ ok: false, error: 'Shipping price is invalid.' });
  });

  it('rejects InPost shipping for non-Poland checkout addresses', () => {
    const result = resolveCheckoutShippingSelection({
      content: CHECKOUT_CONTENT_DEFAULTS,
      country: 'France',
      subtotal: 1500,
      methodId: 'inpost-locker',
      methodLabel: 'InPost Parcel Locker',
      service: 'inpost_locker_standard',
      carrier: 'inpost',
      price: 4,
      inpostPoint: { id: 'WAW01A', name: 'WAW01A' },
    });

    expect(result).toEqual({ ok: false, error: 'Selected shipping method is not available for this address.' });
  });

  it('rejects shipping carriers disabled by provider settings', () => {
    const result = resolveCheckoutShippingSelection({
      content: CHECKOUT_CONTENT_DEFAULTS,
      country: 'Poland',
      subtotal: 1500,
      methodId: 'dpd-courier',
      methodLabel: 'DPD Courier',
      service: 'dpd_courier_standard',
      carrier: 'dpd',
      price: 10,
      inpostPoint: null,
      providerAvailability: { dpd: false },
    });

    expect(result).toEqual({ ok: false, error: 'Selected shipping method is not available for this address.' });
  });
});
