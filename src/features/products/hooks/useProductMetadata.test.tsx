// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCatalogs: vi.fn(),
  useLanguages: vi.fn(),
  usePriceGroups: vi.fn(),
  useProducers: vi.fn(),
  useCategories: vi.fn(),
  useShippingGroups: vi.fn(),
  useTags: vi.fn(),
  useParameters: vi.fn(),
  apiGet: vi.fn(),
  logClientError: vi.fn(),
}));

vi.mock('./useProductMetadataQueries', () => ({
  useCatalogs: () => mocks.useCatalogs(),
  useLanguages: () => mocks.useLanguages(),
  usePriceGroups: () => mocks.usePriceGroups(),
  useProducers: () => mocks.useProducers(),
  useCategories: (...args: unknown[]) => mocks.useCategories(...args),
  useShippingGroups: (...args: unknown[]) => mocks.useShippingGroups(...args),
  useTags: (...args: unknown[]) => mocks.useTags(...args),
  useParameters: (...args: unknown[]) => mocks.useParameters(...args),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mocks.logClientError(...args),
}));

import { useProductMetadata } from './useProductMetadata';

describe('useProductMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useCatalogs.mockReturnValue({
      data: [
        {
          id: 'catalog-1',
          name: 'Main catalog',
          languageIds: [],
          priceGroupIds: ['PLN_STANDARD'],
        },
      ],
      isSuccess: true,
    });
    mocks.useLanguages.mockReturnValue({
      data: [],
      isSuccess: true,
    });
    mocks.usePriceGroups.mockReturnValue({
      data: [
        {
          id: 'group-pln',
          groupId: 'PLN_STANDARD',
          name: 'Standard PLN',
          currencyCode: 'PLN',
          currency: { code: 'PLN' },
          isDefault: true,
          type: 'standard',
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
        },
        {
          id: 'group-eur',
          groupId: 'EUR_STANDARD',
          name: 'Standard EUR',
          currencyCode: 'EUR',
          currency: { code: 'EUR' },
          isDefault: false,
          type: 'standard',
          sourceGroupId: null,
          priceMultiplier: 1.2,
          addToPrice: 0,
        },
      ],
    });
    mocks.useProducers.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mocks.useCategories.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mocks.useShippingGroups.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mocks.useTags.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mocks.useParameters.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mocks.apiGet.mockResolvedValue(null);
  });

  it('keeps catalog price groups when the catalog stores legacy groupId identifiers', () => {
    const { result } = renderHook(() =>
      useProductMetadata({
        initialCatalogIds: ['catalog-1'],
      })
    );

    expect(result.current.filteredPriceGroups.map((group) => group.id)).toEqual(['group-pln']);
  });

  it('seeds edit-product catalog selection from product catalog links', () => {
    const { result } = renderHook(() =>
      useProductMetadata({
        product: {
          id: 'product-1',
          categoryId: null,
          catalogId: null,
          catalogs: [{ catalogId: 'catalog-1' }],
        } as never,
      })
    );

    expect(result.current.selectedCatalogIds).toEqual(['catalog-1']);
    expect(mocks.useParameters).toHaveBeenCalledWith('catalog-1');
  });

  it('falls back to product.catalogId when edit-product catalog links are missing', () => {
    const { result } = renderHook(() =>
      useProductMetadata({
        product: {
          id: 'product-1',
          categoryId: null,
          catalogId: ' catalog-1 ',
          catalogs: [],
        } as never,
      })
    );

    expect(result.current.selectedCatalogIds).toEqual(['catalog-1']);
    expect(mocks.useParameters).toHaveBeenCalledWith('catalog-1');
  });
});
