import { describe, expect, it } from 'vitest';

import { formatPrice, formatPriceTotal } from './locales';

describe('formatPrice', () => {
  it('formats product-list source prices as PLN without EUR conversion', () => {
    expect(formatPrice(100, 'pl')).toBe('100 zł');
    expect(formatPrice(100, 'en')).toBe('100 zł');
  });

  it('preserves fractional source prices', () => {
    expect(formatPrice(19.99, 'pl')).toBe('19,99 zł');
    expect(formatPriceTotal(19.99, 'en')).toBe('19.99 zł');
  });

  it('formats product prices with the exported currency code', () => {
    expect(formatPrice(100, 'en', 'EUR')).toBe('€ 100');
    expect(formatPrice(100, 'pl', 'USD')).toBe('$ 100');
  });
});
