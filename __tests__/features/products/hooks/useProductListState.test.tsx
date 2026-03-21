/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductListState } from '@/features/products/hooks/useProductListState';
import type { ProductWithImages } from '@/shared/contracts/products';

const mocks = vi.hoisted(() => ({
  fetchQuery: vi.fn(),
  apiGet: vi.fn(),
  setEditingProduct: vi.fn(),
  setActionError: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    fetchQuery: mocks.fetchQuery,
    prefetchQuery: vi.fn(),
  }),
  useQuery: () => ({ data: undefined }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/features/drafter/hooks/useDraftQueries', () => ({
  useDraftQueries: () => ({ data: [] }),
  draftKeys: {
    detail: (id: string) => ['drafts', 'detail', id],
  },
}));

vi.mock('@/features/integrations/components/listings/hooks/useIntegrationSelection', () => ({
  fetchIntegrationsWithConnections: vi.fn(),
  fetchPreferredBaseConnection: vi.fn(),
  integrationSelectionQueryKeys: {
    withConnections: ['integrations', 'withConnections'],
    defaultConnection: ['integrations', 'defaultConnection'],
  },
}));

vi.mock('@/features/integrations/hooks/useListingQueries', () => ({
  fetchProductListings: vi.fn(),
  productListingsQueryKey: (id: string) => ['integrations', 'listings', id],
}));

vi.mock('@/features/products/components/list/ProductColumns', () => ({
  getProductColumns: () => [],
}));

vi.mock('@/features/products/components/list/ProductTableSkeleton', () => ({
  ProductTableSkeleton: () => null,
}));

vi.mock('@/features/products/hooks/useCatalogSync', () => ({
  useCatalogSync: () => ({
    catalogs: [],
    currencyCode: 'USD',
    setCurrencyCode: vi.fn(),
    currencyOptions: [],
    priceGroups: [],
    languageOptions: [],
  }),
}));

vi.mock('@/features/products/hooks/useProductData', () => ({
  useProductData: () => ({
    data: [],
    totalPages: 1,
    page: 1,
    setPage: vi.fn(),
    pageSize: 20,
    setPageSize: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    productId: '',
    setProductId: vi.fn(),
    idMatchMode: 'exact',
    setIdMatchMode: vi.fn(),
    sku: '',
    setSku: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    categoryId: '',
    setCategoryId: vi.fn(),
    minPrice: undefined,
    setMinPrice: vi.fn(),
    maxPrice: undefined,
    setMaxPrice: vi.fn(),
    stockValue: undefined,
    setStockValue: vi.fn(),
    stockOperator: '',
    setStockOperator: vi.fn(),
    startDate: undefined,
    setStartDate: vi.fn(),
    endDate: undefined,
    setEndDate: vi.fn(),
    advancedFilter: '',
    activeAdvancedFilterPresetId: null,
    setAdvancedFilterState: vi.fn(),
    catalogFilter: 'all',
    setCatalogFilter: vi.fn(),
    baseExported: '',
    setBaseExported: vi.fn(),
    loadError: null,
    isLoading: false,
    isFetching: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/features/products/hooks/useProductEnhancements', () => ({
  useProductSync: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductOperations', () => ({
  useProductOperations: () => ({
    isCreateOpen: false,
    setIsCreateOpen: vi.fn(),
    initialSku: '',
    setInitialSku: vi.fn(),
    editingProduct: null,
    setEditingProduct: mocks.setEditingProduct,
    isPromptOpen: false,
    setIsPromptOpen: vi.fn(),
    lastEditedId: null,
    actionError: null,
    setActionError: mocks.setActionError,
    handleOpenCreateModal: vi.fn(),
    handleConfirmSku: vi.fn(),
    handleOpenCreateFromDraft: vi.fn(),
    handleCreateSuccess: vi.fn(),
    handleEditSuccess: vi.fn(),
    handleEditSave: vi.fn(),
  }),
}));

vi.mock('@/features/products/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      catalogFilter: 'all',
      pageSize: 20,
      appliedAdvancedFilter: '',
      appliedAdvancedFilterPresetId: null,
      nameLocale: 'name_en',
      currencyCode: 'USD',
      filtersCollapsedByDefault: false,
      thumbnailSource: 'file',
    },
    loading: false,
    setNameLocale: vi.fn(),
    setCatalogFilter: vi.fn(),
    setCurrencyCode: vi.fn(),
    setPageSize: vi.fn(),
    setAppliedAdvancedFilterState: vi.fn(),
  }),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  useQueuedProductIds: () => new Set<string>(),
  useQueuedAiRunProductIds: () => new Set<string>(),
}));

vi.mock('@/shared/hooks/sync/useBackgroundSync', () => ({
  useProductListSync: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => {
  class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  return {
    ApiError,
    api: {
      get: mocks.apiGet,
    },
  };
});

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createSingleQueryV2: () => ({
    data: undefined,
    error: null,
  }),
  createListQueryV2: () => ({
    data: [],
    error: null,
  }),
  fetchQueryV2:
    (
      _queryClient: unknown,
      options: { queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown> }
    ) =>
      () =>
        options.queryFn({ signal: new AbortController().signal }),
  prefetchQueryV2:
    (
      _queryClient: unknown,
      options: { queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown> }
    ) =>
      () =>
        options.queryFn({ signal: new AbortController().signal }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('@/features/products/hooks/product-list/useProductListSelection', () => ({
  useProductListSelection: () => ({
    rowSelection: {},
    setRowSelection: vi.fn(),
    handleSelectAllGlobal: vi.fn(),
    loadingGlobalSelection: false,
    isMassDeleteConfirmOpen: false,
    setIsMassDeleteConfirmOpen: vi.fn(),
    handleMassDelete: vi.fn(),
    productToDelete: null,
    setProductToDelete: vi.fn(),
    handleConfirmSingleDelete: vi.fn(),
    bulkDeletePending: false,
  }),
}));

vi.mock('@/features/products/hooks/product-list/useProductListModals', () => ({
  useProductListModals: () => ({
    createDraft: null,
    setCreateDraft: vi.fn(),
    handleOpenCreate: vi.fn(),
    handleOpenIntegrationsModal: vi.fn(),
    handleOpenExportSettings: vi.fn(),
    handleCloseIntegrations: vi.fn(),
    handleCloseListProduct: vi.fn(),
    handleListProductSuccess: vi.fn(),
    handleStartListing: vi.fn(),
    massListIntegration: null,
    massListProductIds: [],
    showIntegrationModal: false,
    handleCloseIntegrationModal: vi.fn(),
    handleSelectIntegrationFromModal: vi.fn(),
    handleCloseMassList: vi.fn(),
    handleMassListSuccess: vi.fn(),
    handleAddToMarketplace: vi.fn(),
    integrationsProduct: null,
    showListProductModal: false,
    listProductPreset: null,
    integrationBadgeIds: new Set<string>(),
    integrationBadgeStatuses: new Map<string, string>(),
    traderaBadgeIds: new Set<string>(),
    traderaBadgeStatuses: new Map<string, string>(),
    exportSettingsProduct: null,
    setExportSettingsProduct: vi.fn(),
    refreshListingBadges: vi.fn(),
  }),
}));

vi.mock('@/features/products/hooks/product-list/useProductListUrlSync', () => ({
  useProductListUrlSync: () => ({
    clearProductEditorQueryParams: vi.fn(),
  }),
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useProductListState', () => {
  beforeEach(() => {
    mocks.fetchQuery.mockReset();
    mocks.apiGet.mockReset();
    mocks.setEditingProduct.mockReset();
    mocks.setActionError.mockReset();
    mocks.toast.mockReset();

    mocks.fetchQuery.mockImplementation(
      (options: { queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown> }) =>
        options.queryFn({ signal: new AbortController().signal })
    );
  });

  it('ignores stale product detail response when a newer edit target was opened', async () => {
    const productA = {
      id: 'product-a',
      updatedAt: '2026-03-01T00:00:00.000Z',
    } as ProductWithImages;
    const productB = {
      id: 'product-b',
      updatedAt: '2026-03-01T00:00:00.000Z',
    } as ProductWithImages;

    const deferredA = createDeferred<ProductWithImages>();
    const deferredB = createDeferred<ProductWithImages>();

    mocks.apiGet.mockImplementation((url: string) => {
      if (url.includes('/api/v2/products/product-a?fresh=1')) return deferredA.promise;
      if (url.includes('/api/v2/products/product-b?fresh=1')) return deferredB.promise;
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const { result } = renderHook(() => useProductListState());

    act(() => {
      result.current.onProductEditClick(productA);
    });
    act(() => {
      result.current.onProductEditClick(productB);
    });

    await act(async () => {
      deferredB.resolve({
        ...productB,
        name_en: 'Fresh B',
      } as ProductWithImages);
      await Promise.resolve();
    });

    await act(async () => {
      deferredA.resolve({
        ...productA,
        name_en: 'Fresh A',
      } as ProductWithImages);
      await Promise.resolve();
    });

    expect(mocks.setEditingProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'product-b',
        name_en: 'Fresh B',
      })
    );
    expect(mocks.setEditingProduct).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'product-a',
        name_en: 'Fresh A',
      })
    );

    const setCalls = mocks.setEditingProduct.mock.calls.map((call: unknown[]) => call[0]);
    expect(setCalls).toContain(productA);
    expect(setCalls).toContain(productB);

    const lastArg = mocks.setEditingProduct.mock.calls.at(-1)?.[0] as
      | ProductWithImages
      | undefined;
    expect(lastArg?.id).toBe('product-b');
  });
});
