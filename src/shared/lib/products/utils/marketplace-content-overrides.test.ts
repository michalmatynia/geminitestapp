import { describe, expect, it } from 'vitest';

import {
  resolveMarketplaceAwareProductCopy,
  resolveMarketplaceContentOverride,
} from './marketplace-content-overrides';

const createProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'product-1',
  sku: 'SKU-1',
  name_en: 'Default English Name',
  name_pl: 'Domyslna nazwa',
  name_de: null,
  description_en: 'Default English description',
  description_pl: 'Domyslny opis',
  description_de: null,
  marketplaceContentOverrides: [],
  ...overrides,
});

describe('resolveMarketplaceContentOverride', () => {
  it('returns the matching override for the integration id', () => {
    expect(
      resolveMarketplaceContentOverride(
        [
          {
            integrationIds: ['tradera-1'],
            title: 'Tradera title',
            description: null,
          },
          {
            integrationIds: ['vinted-1'],
            title: null,
            description: 'Vinted description',
          },
        ],
        'vinted-1'
      )
    ).toEqual({
      integrationIds: ['vinted-1'],
      title: null,
      description: 'Vinted description',
    });
  });

  it('returns null when the integration id is empty or not assigned', () => {
    expect(resolveMarketplaceContentOverride([], '')).toBeNull();
    expect(
      resolveMarketplaceContentOverride(
        [
          {
            integrationIds: ['tradera-1'],
            title: 'Tradera title',
            description: null,
          },
        ],
        'missing'
      )
    ).toBeNull();
  });
});

describe('resolveMarketplaceAwareProductCopy', () => {
  it('prefers marketplace-specific override content when the integration matches', () => {
    expect(
      resolveMarketplaceAwareProductCopy({
        product: createProduct({
          marketplaceContentOverrides: [
            {
              integrationIds: ['tradera-1'],
              title: 'Tradera override',
              description: 'Tradera override description',
            },
          ],
        }),
        integrationId: 'tradera-1',
        preferredLocales: ['pl', 'en'],
      })
    ).toMatchObject({
      title: 'Tradera override',
      description: 'Tradera override description',
      override: {
        integrationIds: ['tradera-1'],
        title: 'Tradera override',
        description: 'Tradera override description',
      },
    });
  });

  it('falls back to localized product copy when no override matches', () => {
    expect(
      resolveMarketplaceAwareProductCopy({
        product: createProduct(),
        integrationId: 'missing',
        preferredLocales: ['pl', 'en'],
      })
    ).toMatchObject({
      title: 'Domyslna nazwa',
      description: 'Domyslny opis',
      override: null,
    });
  });

  it('falls back to SKU or product id when product names are missing', () => {
    expect(
      resolveMarketplaceAwareProductCopy({
        product: createProduct({
          sku: 'SKU-FALLBACK',
          name_en: null,
          name_pl: '',
          description_en: null,
          description_pl: '',
        }),
        integrationId: null,
        preferredLocales: ['pl', 'en'],
      })
    ).toMatchObject({
      title: 'SKU-FALLBACK',
      description: 'SKU-FALLBACK',
      override: null,
    });
  });
});
