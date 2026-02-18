import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductMetadata } from '@/features/products/hooks/useProductMetadata';
import * as metadataQueries from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductCategory, ProductWithImages } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCatalogs: vi.fn(),
  useCategories: vi.fn(),
  useLanguages: vi.fn(),
  useParameters: vi.fn(),
  usePriceGroups: vi.fn(),
  useProducers: vi.fn(),
  useTags: vi.fn(),
  productMetadataKeys: {},
  useDeleteProducerMutation: vi.fn(),
  useSaveProducerMutation: vi.fn(),
}));

type QueryResult<T> = {
  data: T;
  isLoading: boolean;
  error: Error | null;
};

const queryResult = <T,>(data: T): QueryResult<T> => ({
  data,
  isLoading: false,
  error: null,
});

const buildProduct = (overrides: Partial<ProductWithImages>): ProductWithImages =>
  ({
    id: 'product-1',
    categoryId: null,
    catalogId: '',
    catalogs: [],
    tags: [],
    producers: [],
    ...overrides,
  }) as ProductWithImages;

describe('useProductMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ catalogId: '' } as never);
    vi.mocked(metadataQueries.useCatalogs).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.useLanguages).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.usePriceGroups).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.useProducers).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.useTags).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.useParameters).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.useCategories).mockImplementation((catalogId?: string) => {
      void catalogId;
      return queryResult([]) as never;
    });
  });

  it('derives catalog selection from nested catalog relation shape', () => {
    const product = buildProduct({
      catalogId: '',
      catalogs: [
        {
          catalog: { id: 'catalog-nested' },
        },
      ] as ProductWithImages['catalogs'],
    });

    const { result } = renderHook(() => useProductMetadata({ product }));

    expect(result.current.selectedCatalogIds).toEqual(['catalog-nested']);
    expect(vi.mocked(metadataQueries.useCategories)).toHaveBeenLastCalledWith('catalog-nested');
  });

  it('derives initial category selection from legacy category relations', () => {
    const product = {
      ...buildProduct({
        categoryId: null,
        catalogs: [
          { catalogId: 'catalog-a' },
        ] as ProductWithImages['catalogs'],
      }),
      categories: [{ categoryId: 'cat-legacy' }],
    } as unknown as ProductWithImages;

    const { result } = renderHook(() => useProductMetadata({ product }));

    expect(result.current.selectedCategoryId).toBe('cat-legacy');
  });

  it('realigns primary catalog to saved category catalog on initial edit mismatch', async () => {
    vi.mocked(metadataQueries.useCategories).mockImplementation((catalogId?: string) => {
      const normalized = typeof catalogId === 'string' ? catalogId.trim() : '';
      if (normalized === 'catalog-a') {
        return queryResult<ProductCategory[]>([
          {
            id: 'cat-other',
            name: 'Other',
            catalogId: 'catalog-a',
          } as ProductCategory,
        ]) as never;
      }
      if (normalized === 'catalog-b') {
        return queryResult<ProductCategory[]>([
          {
            id: 'cat-keychain',
            name: 'Keychain',
            catalogId: 'catalog-b',
          } as ProductCategory,
        ]) as never;
      }
      return queryResult<ProductCategory[]>([]) as never;
    });
    vi.mocked(api.get).mockResolvedValue({
      id: 'cat-keychain',
      name: 'Keychain',
      catalogId: 'catalog-b',
    } as ProductCategory);

    const product = buildProduct({
      id: 'product-mismatch',
      categoryId: 'cat-keychain',
      catalogId: 'catalog-a',
      catalogs: [
        { catalogId: 'catalog-a' },
        { catalogId: 'catalog-b' },
      ] as ProductWithImages['catalogs'],
    });

    const { result } = renderHook(() => useProductMetadata({ product }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/products/categories/cat-keychain', {
        logError: false,
      });
    });
    await waitFor(() => {
      expect(result.current.selectedCatalogIds[0]).toBe('catalog-b');
    });
  });
});
