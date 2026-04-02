import { describe, expect, it } from 'vitest';

import { createProductListingsViewContextValue } from './ProductListingsViewContext';

describe('createProductListingsViewContextValue', () => {
  it('filters listings by the grouped marketplace scope and resolves the scoped label', () => {
    const value = createProductListingsViewContextValue({
      listings: [
        {
          id: 'listing-base-1',
          integration: { slug: 'baselinker' },
        } as never,
        {
          id: 'listing-tradera-1',
          integration: { slug: 'tradera' },
        } as never,
        {
          id: 'listing-tradera-2',
          integration: { slug: 'tradera-api' },
        } as never,
      ],
      filterIntegrationSlug: 'tradera',
    });

    expect(value.filteredListings.map((listing) => listing.id)).toEqual([
      'listing-tradera-1',
      'listing-tradera-2',
    ]);
    expect(value.integrationScopeLabel).toBe('Tradera');
    expect(value.statusTargetLabel).toBe('Tradera');
    expect(value.filterIntegrationSlug).toBe('tradera');
    expect(value.isScopedMarketplaceFlow).toBe(true);
    expect(value.isBaseFilter).toBe(false);
    expect(value.showSync).toBe(true);
  });

  it('preserves all listings and generic labels when no scope is applied', () => {
    const value = createProductListingsViewContextValue({
      listings: [
        {
          id: 'listing-base-1',
          integration: { slug: 'baselinker' },
        } as never,
        {
          id: 'listing-tradera-1',
          integration: { slug: 'tradera' },
        } as never,
      ],
      filterIntegrationSlug: null,
    });

    expect(value.filteredListings.map((listing) => listing.id)).toEqual([
      'listing-base-1',
      'listing-tradera-1',
    ]);
    expect(value.integrationScopeLabel).toBeNull();
    expect(value.statusTargetLabel).toBe('integration');
    expect(value.filterIntegrationSlug).toBeNull();
    expect(value.isScopedMarketplaceFlow).toBe(false);
    expect(value.isBaseFilter).toBe(false);
    expect(value.showSync).toBe(false);
  });

  it('marks the Base.com scope correctly', () => {
    const value = createProductListingsViewContextValue({
      listings: [],
      filterIntegrationSlug: 'base',
    });

    expect(value.integrationScopeLabel).toBe('Base.com');
    expect(value.statusTargetLabel).toBe('Base.com');
    expect(value.isScopedMarketplaceFlow).toBe(true);
    expect(value.isBaseFilter).toBe(true);
    expect(value.showSync).toBe(true);
  });
});
