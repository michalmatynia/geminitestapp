// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAdvancedFilterPreset } from '@/shared/contracts/products/filters';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  useIntegrationListingBadgesMock,
  useProductListListingStatusesMock,
} = vi.hoisted(() => ({
  useIntegrationListingBadgesMock: vi.fn(),
  useProductListListingStatusesMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationOperations', () => ({
  useIntegrationListingBadges: (...args: unknown[]) => useIntegrationListingBadgesMock(...args),
}));

vi.mock('@/features/products/hooks/product-list/useProductListListingStatuses', () => ({
  useProductListListingStatuses: (...args: unknown[]) => useProductListListingStatusesMock(...args),
}));

import {
  ProductListProvider,
  useProductListRowRuntime,
  useProductListTableContext,
} from './ProductListContext';
import type { ProductListContextType } from './ProductListContext.types';

type BadgeState = {
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  playwrightProgrammableBadgeIds: Set<string>;
  playwrightProgrammableBadgeStatuses: Map<string, string>;
  vintedBadgeIds: Set<string>;
  vintedBadgeStatuses: Map<string, string>;
};

const createBadgeState = (overrides: Partial<BadgeState> = {}): BadgeState => ({
  integrationBadgeIds: new Set<string>(),
  integrationBadgeStatuses: new Map<string, string>(),
  traderaBadgeIds: new Set<string>(),
  traderaBadgeStatuses: new Map<string, string>(),
  playwrightProgrammableBadgeIds: new Set<string>(),
  playwrightProgrammableBadgeStatuses: new Map<string, string>(),
  vintedBadgeIds: new Set<string>(),
  vintedBadgeStatuses: new Map<string, string>(),
  ...overrides,
});

const listeners = new Set<() => void>();
let badgeState = createBadgeState();

const publishBadgeState = (nextState: BadgeState): void => {
  badgeState = nextState;
  listeners.forEach((listener) => listener());
};

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: '',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

const createProviderValue = (
  overrides: Partial<
    ProductListContextType & {
      triggerListingStatusHighlight: (productId: string) => void;
      rowRuntimeReady: boolean;
    }
  > = {}
): ProductListContextType & {
  triggerListingStatusHighlight: (productId: string) => void;
  rowRuntimeReady: boolean;
} =>
  ({
    onCreateProduct: vi.fn(),
    onCreateFromDraft: vi.fn(),
    activeDrafts: [],
    page: 1,
    totalPages: 1,
    setPage: vi.fn(),
    pageSize: 25,
    setPageSize: vi.fn(),
    nameLocale: 'name_en',
    setNameLocale: vi.fn(),
    languageOptions: [],
    currencyCode: 'USD',
    setCurrencyCode: vi.fn(),
    currencyOptions: [],
    filtersCollapsedByDefault: false,
    catalogFilter: 'all',
    setCatalogFilter: vi.fn(),
    catalogs: [],
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
    startDate: '',
    setStartDate: vi.fn(),
    endDate: '',
    setEndDate: vi.fn(),
    advancedFilter: '',
    activeAdvancedFilterPresetId: null,
    advancedFilterPresets: [] as ProductAdvancedFilterPreset[],
    setAdvancedFilterPresets: vi.fn(),
    setAdvancedFilter: vi.fn(),
    setAdvancedFilterState: vi.fn(),
    baseExported: '',
    setBaseExported: vi.fn(),
    data: [createProduct()],
    isLoading: false,
    loadError: null,
    actionError: null,
    onDismissActionError: vi.fn(),
    setRefreshTrigger: vi.fn(),
    rowSelection: {},
    setRowSelection: vi.fn(),
    onSelectAllGlobal: vi.fn(),
    loadingGlobal: false,
    onDeleteSelected: vi.fn(),
    onAddToMarketplace: vi.fn(),
    handleProductsTableRender: vi.fn(),
    tableColumns: [],
    getRowClassName: undefined,
    getRowId: (row: ProductWithImages) => row.id,
    skeletonRows: null,
    maxHeight: undefined,
    stickyHeader: true,
    productNameKey: 'name_en',
    priceGroups: [],
    onPrefetchProductDetail: vi.fn(),
    onProductNameClick: vi.fn(),
    onProductEditClick: vi.fn(),
    onProductDeleteClick: vi.fn(),
    onDuplicateProduct: vi.fn(),
    onIntegrationsClick: vi.fn(),
    onExportSettingsClick: vi.fn(),
    integrationBadgeIds: new Set<string>(),
    integrationBadgeStatuses: new Map<string, string>(),
    traderaBadgeIds: new Set<string>(),
    traderaBadgeStatuses: new Map<string, string>(),
    playwrightProgrammableBadgeIds: new Set<string>(),
    playwrightProgrammableBadgeStatuses: new Map<string, string>(),
    queuedProductIds: new Set<string>(),
    productAiRunStatusByProductId: new Map(),
    categoryNameById: new Map<string, string>(),
    thumbnailSource: 'file',
    showTriggerRunFeedback: true,
    setShowTriggerRunFeedback: vi.fn(),
    imageExternalBaseUrl: null,
    isCreateOpen: false,
    isPromptOpen: false,
    setIsPromptOpen: vi.fn(),
    handleConfirmSku: vi.fn(),
    initialSku: '',
    createDraft: null,
    initialCatalogId: null,
    onCloseCreate: vi.fn(),
    onCreateSuccess: vi.fn(),
    editingProduct: null,
    isEditHydrating: false,
    onCloseEdit: vi.fn(),
    onEditSuccess: vi.fn(),
    onEditSave: vi.fn(),
    integrationsProduct: null,
    integrationsRecoveryContext: null,
    integrationsFilterIntegrationSlug: null,
    onCloseIntegrations: vi.fn(),
    onStartListing: vi.fn(),
    showListProductModal: false,
    onCloseListProduct: vi.fn(),
    onListProductSuccess: vi.fn(),
    listProductPreset: null,
    exportSettingsProduct: null,
    onCloseExportSettings: vi.fn(),
    onListingsUpdated: vi.fn(),
    massListIntegration: null,
    massListProductIds: [],
    onCloseMassList: vi.fn(),
    onMassListSuccess: vi.fn(),
    showIntegrationModal: false,
    onCloseIntegrationModal: vi.fn(),
    onSelectIntegrationFromModal: vi.fn(),
    triggerListingStatusHighlight: vi.fn(),
    rowRuntimeReady: true,
    ...overrides,
  }) as ProductListContextType & {
    triggerListingStatusHighlight: (productId: string) => void;
    rowRuntimeReady: boolean;
  };

describe('ProductListProvider runtime bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    badgeState = createBadgeState();
    useIntegrationListingBadgesMock.mockImplementation(() =>
      React.useSyncExternalStore(
        (listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => badgeState,
        () => badgeState
      )
    );
    useProductListListingStatusesMock.mockImplementation(() => undefined);
  });

  it('updates row runtime without rerendering table-context consumers when badge polling changes', async () => {
    let tableRenderCount = 0;
    let rowRuntimeRenderCount = 0;

    function TableRenderProbe(): React.JSX.Element {
      tableRenderCount += 1;
      const table = useProductListTableContext();
      return <div data-testid='table-row-count'>{table.data.length}</div>;
    }

    function RowRuntimeProbe(): React.JSX.Element {
      rowRuntimeRenderCount += 1;
      const runtime = useProductListRowRuntime('product-1', null);
      return <div data-testid='row-runtime-status'>{runtime.integrationStatus}</div>;
    }

    render(
      <ProductListProvider value={createProviderValue()}>
        <TableRenderProbe />
        <RowRuntimeProbe />
      </ProductListProvider>
    );

    expect(screen.getByTestId('row-runtime-status').textContent).toBe('not_started');
    expect(screen.getByTestId('table-row-count').textContent).toBe('1');
    expect(tableRenderCount).toBe(1);
    expect(rowRuntimeRenderCount).toBe(1);

    act(() => {
      publishBadgeState(
        createBadgeState({
          integrationBadgeIds: new Set(['product-1']),
          integrationBadgeStatuses: new Map([['product-1', 'processing']]),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('row-runtime-status').textContent).toBe('processing');
    });

    expect(tableRenderCount).toBe(1);
    expect(rowRuntimeRenderCount).toBeGreaterThan(1);
  });

  it('keeps provider-side badge polling disabled until row runtime is ready', () => {
    render(
      <ProductListProvider value={createProviderValue({ rowRuntimeReady: false })}>
        <div>probe</div>
      </ProductListProvider>
    );

    expect(useIntegrationListingBadgesMock).toHaveBeenCalledWith(['product-1'], {
      enabled: false,
    });
  });

  it('surfaces programmable Playwright badge state through the row runtime bridge', async () => {
    function RowRuntimeProbe(): React.JSX.Element {
      const runtime = useProductListRowRuntime('product-1', null);
      return (
        <div data-testid='row-runtime-playwright'>
          {String(runtime.showPlaywrightProgrammableBadge)}:{runtime.playwrightProgrammableStatus}
        </div>
      );
    }

    render(
      <ProductListProvider value={createProviderValue()}>
        <RowRuntimeProbe />
      </ProductListProvider>
    );

    expect(screen.getByTestId('row-runtime-playwright').textContent).toBe('false:not_started');

    act(() => {
      publishBadgeState(
        createBadgeState({
          playwrightProgrammableBadgeIds: new Set(['product-1']),
          playwrightProgrammableBadgeStatuses: new Map([['product-1', 'queued']]),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('row-runtime-playwright').textContent).toBe('true:queued');
    });
  });
});
