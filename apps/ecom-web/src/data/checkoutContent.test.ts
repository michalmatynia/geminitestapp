/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import { COUNTRIES } from './countries';
import { CHECKOUT_CONTENT_DEFAULTS, validateCheckoutContent } from './checkoutContent';

describe('checkout content validation', () => {
  it('accepts shipping zones with positive integer business day ranges', () => {
    const { content, errors } = validateCheckoutContent({
      shippingZones: [
        {
          id: 'test-zone',
          label: 'Test zone',
          countries: ['France'],
          methods: [
            {
              id: 'standard',
              label: 'Standard',
              detail: '3-5 business days',
              price: 0,
              priceLabel: 'Free',
              businessDaysMin: 3,
              businessDaysMax: 5,
            },
          ],
        },
      ],
    });

    expect(errors).toEqual([]);
    expect(content.shippingZones[0]).toEqual({
      id: 'test-zone',
      label: 'Test zone',
      countries: ['France'],
      methods: [
        {
          id: 'standard',
          label: 'Standard',
          detail: '3-5 business days',
          price: 0,
          priceLabel: 'Free',
          businessDaysMin: 3,
          businessDaysMax: 5,
        },
      ],
    });
  });

  it('rejects fractional or inverted business day ranges', () => {
    const { errors: fractionalErrors } = validateCheckoutContent({
      shippingMethods: [
        {
          ...CHECKOUT_CONTENT_DEFAULTS.shippingMethods[0],
          businessDaysMin: 1.5,
        },
      ],
    });
    const { errors: invertedErrors } = validateCheckoutContent({
      shippingMethods: [
        {
          ...CHECKOUT_CONTENT_DEFAULTS.shippingMethods[0],
          businessDaysMin: 5,
          businessDaysMax: 3,
        },
      ],
    });

    expect(fractionalErrors).toContain('shippingMethods.0.businessDaysMin must be a positive integer.');
    expect(invertedErrors).toContain('shippingMethods.0.businessDaysMax must be greater than or equal to businessDaysMin.');
  });

  it('rejects invalid free-shipping CMS settings', () => {
    const { errors } = validateCheckoutContent({
      freeShippingThreshold: -1,
      freeShippingMethodId: '',
    });

    expect(errors).toContain('freeShippingThreshold must be a non-negative number.');
    expect(errors).toContain('freeShippingMethodId must not be empty.');
  });

  it('limits the number of configured shipping zones', () => {
    const { errors } = validateCheckoutContent({
      shippingZones: Array.from({ length: 11 }, (_, index) => ({
        id: `zone-${index}`,
        label: `Zone ${index}`,
        countries: [],
        methods: CHECKOUT_CONTENT_DEFAULTS.shippingMethods,
      })),
    });

    expect(errors).toContain('shippingZones can contain at most 10 zones.');
  });

  it('normalizes empty zone method lists back to safe fallback methods', () => {
    const { content, errors } = validateCheckoutContent({
      shippingZones: [
        {
          id: 'custom',
          label: 'Custom',
          countries: ['France'],
          methods: [],
        },
      ],
    });

    expect(errors).toEqual([]);
    expect(content.shippingZones[0].methods).toEqual(CHECKOUT_CONTENT_DEFAULTS.shippingZones[0].methods);
  });
});

describe('default checkout shipping configuration', () => {
  it('uses dropdown country names for all explicit shipping zone countries', () => {
    const countryNames = new Set(COUNTRIES.map((country) => country.name));
    const zoneCountries = CHECKOUT_CONTENT_DEFAULTS.shippingZones
      .flatMap((zone) => zone.countries);

    expect(zoneCountries).not.toHaveLength(0);
    expect(zoneCountries.filter((country) => !countryNames.has(country))).toEqual([]);
  });

  it('keeps the international catch-all as the final default shipping zone', () => {
    const zones = CHECKOUT_CONTENT_DEFAULTS.shippingZones;
    const lastZone = zones[zones.length - 1];

    expect(lastZone.id).toBe('international');
    expect(lastZone.countries).toEqual([]);
  });

  it('keeps United Kingdom out of the EU default zone', () => {
    const euZone = CHECKOUT_CONTENT_DEFAULTS.shippingZones.find((zone) => zone.id === 'eu');

    expect(euZone?.countries).toContain('France');
    expect(euZone?.countries).not.toContain('United Kingdom');
  });
});
