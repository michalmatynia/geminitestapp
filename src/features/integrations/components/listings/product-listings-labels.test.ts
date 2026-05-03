import { describe, expect, it } from 'vitest';

import {
  resolveIntegrationDisplayName,
  resolveProductListingsProductName,
} from './product-listings-labels';

describe('product-listings-labels', () => {
  it('resolves the first available product display name with a generic fallback', () => {
    expect(
      resolveProductListingsProductName({
        name_en: 'English Name',
        name_pl: 'Polish Name',
        name_de: 'German Name',
      } as never)
    ).toBe('English Name');

    expect(
      resolveProductListingsProductName({
        name_en: '',
        name_pl: 'Polish Name',
        name_de: 'German Name',
      } as never)
    ).toBe('Polish Name');

    expect(
      resolveProductListingsProductName({
        name_en: '',
        name_pl: '',
        name_de: '',
      } as never)
    ).toBe('Unnamed Product');
  });

  it('normalizes integration display names by trimming empty values to null', () => {
    expect(resolveIntegrationDisplayName('  Tradera  ')).toBe('Tradera');
    expect(resolveIntegrationDisplayName('Vinted', 'vinted')).toBe('Vinted.pl');
    expect(resolveIntegrationDisplayName('  Vinted  ')).toBe('Vinted.pl');
    expect(resolveIntegrationDisplayName('   ')).toBeNull();
    expect(resolveIntegrationDisplayName(null)).toBeNull();
  });
});
