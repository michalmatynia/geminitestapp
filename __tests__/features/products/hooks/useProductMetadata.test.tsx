import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductMetadata } from '@/features/products/hooks/useProductMetadata';
import * as metadataQueries from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductCategory, ProductWithImages } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

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
  useShippingGroups: vi.fn(),
  useTags: vi.fn(),
  productMetadataKeys: {},
  useDeleteProducerMutation: vi.fn(),
  useSaveProducerMutation: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('@/features/products/hooks/editingProductHydration', () => ({
  isEditingProductHydrated: vi.fn(() => false),
  markEditingProductHydrated: vi.fn((p: unknown) => p),
  warnNonHydratedEditProduct: vi.fn(),
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

const queryResultSuccess = <T,>(data: T): QueryResult<T> & { isSuccess: boolean } => ({
  data,
  isLoading: false,
  isSuccess: true,
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
    vi.mocked(metadataQueries.useShippingGroups).mockReturnValue(queryResult([]) as never);
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

  it('does not derive category selection from removed legacy category relations', () => {
    const product = {
      ...buildProduct({
        categoryId: null,
        catalogs: [{ catalogId: 'catalog-a' }] as ProductWithImages['catalogs'],
      }),
      categories: [{ categoryId: 'cat-legacy' }],
    } as unknown as ProductWithImages;

    const { result } = renderHook(() => useProductMetadata({ product }));

    expect(result.current.selectedCategoryId).toBeNull();
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
      expect(api.get).toHaveBeenCalledWith('/api/v2/products/categories/cat-keychain', {
        logError: false,
      });
    });
    await waitFor(() => {
      expect(result.current.selectedCatalogIds[0]).toBe('catalog-b');
    });
  });

  it('does NOT fire logClientError guard when catalog/language queries are still loading', () => {
    // Default queryResult does not include isSuccess — simulates a pending/loading state.
    vi.mocked(metadataQueries.useCatalogs).mockReturnValue(queryResult([]) as never);
    vi.mocked(metadataQueries.useLanguages).mockReturnValue(queryResult([]) as never);
    const product = buildProduct({ id: 'p-loading', catalogId: 'cat-1', catalogs: [] });

    renderHook(() => useProductMetadata({ product }));

    expect(logClientError).not.toHaveBeenCalled();
  });

  it('fires logClientError guard when both queries succeed but filteredLanguages is empty for editing product', () => {
    // Scenario: catalog IS found but its languageIds don't match any language in the system.
    // selectedCatalogs resolves, languageIdSet is populated, but filter produces no matches.
    // This is the guard's target: data loaded, yet form fields would be invisible.
    vi.mocked(metadataQueries.useCatalogs).mockReturnValue(
      queryResultSuccess([
        { id: 'cat-missing', name: 'Ghost Catalog', languageIds: ['nonexistent-lang'] },
      ]) as never
    );
    vi.mocked(metadataQueries.useLanguages).mockReturnValue(
      queryResultSuccess([{ id: 'lang-en', code: 'en', name: 'English' }]) as never
    );
    const product = buildProduct({ id: 'p-broken', catalogId: 'cat-missing', catalogs: [] });

    renderHook(() => useProductMetadata({ product }));

    expect(logClientError).toHaveBeenCalledTimes(1);
    const [err, extra] = vi.mocked(logClientError).mock.calls[0] as [
      Error,
      { context: Record<string, unknown> },
    ];
    expect(err.message).toContain('filteredLanguages empty');
    expect(extra.context['productId']).toBe('p-broken');
    expect(extra.context['service']).toBe('products');
    expect(extra.context['category']).toBe('form-guard');
    expect(extra.context['isHydrated']).toBe(false);
    expect(extra.context['languagesCount']).toBe(1);
    expect(extra.context['catalogsCount']).toBe(1);
  });
});
