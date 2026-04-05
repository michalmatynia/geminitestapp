/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';

import AdminProductsPage from '@/app/(admin)/admin/products/page';
import { getProductColumns } from '@/features/products/components/list/ProductColumns';
import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';
import {
  ProductListProvider,
  type ProductListContextType,
} from '@/features/products/context/ProductListContext';
import { server } from '@/mocks/server';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { DataTable } from '@/shared/ui/data-display.public';
import { ToastProvider } from '@/shared/ui/toast';
import type { ProductWithImages } from '@/shared/contracts/products';

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

let queryClient: QueryClient;

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: () => null,
}));

const mockProducts: ProductWithImages[] = [
  {
    id: 'product-1',
    name_en: 'Product Alpha',
    name_pl: null,
    name_de: null,
    sku: 'ALPHA1',
    price: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
    name: { en: 'Product Alpha' },
    description: { en: '' },
    categoryId: '',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    tags: [],
    noteIds: [],
    metadata: {},
    isPublic: false,
    isArchived: false,
    status: 'active',
    catalogs: [],
    categories: [],
    producers: [],
  } as any,
  {
    id: 'product-2',
    name_en: 'Product Beta',
    name_pl: null,
    name_de: null,
    sku: 'BETA2',
    price: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
    name: { en: 'Product Beta' },
    description: { en: '' },
    categoryId: '',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    tags: [],
    noteIds: [],
    metadata: {},
    isPublic: false,
    isArchived: false,
    status: 'active',
    catalogs: [],
    categories: [],
    producers: [],
  } as any,
];

const buildContextValue = (
  overrides: Partial<ProductListContextType> = {}
): ProductListContextType => ({
  onCreateProduct: vi.fn(),
  onCreateFromDraft: vi.fn(),
  activeDrafts: [],
  page: 1,
  totalPages: 1,
  setPage: vi.fn(),
  pageSize: 24,
  setPageSize: vi.fn(),
  nameLocale: 'name_en',
  setNameLocale: vi.fn(),
  languageOptions: [{ value: 'name_en', label: 'English' }],
  currencyCode: 'USD',
  setCurrencyCode: vi.fn(),
  currencyOptions: ['USD'],
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
  baseExported: '',
  setBaseExported: vi.fn(),
  advancedFilter: '',
  activeAdvancedFilterPresetId: null,
  setAdvancedFilter: vi.fn(),
  setAdvancedFilterState: vi.fn(),
  data: mockProducts,
  isLoading: false,
  loadError: null,
  actionError: null,
  onDismissActionError: vi.fn(),
  setRefreshTrigger: vi.fn(),
  rowSelection: {},
  setRowSelection: vi.fn(),
  onSelectAllGlobal: vi.fn().mockResolvedValue(undefined),
  loadingGlobal: false,
  onDeleteSelected: vi.fn().mockResolvedValue(undefined),
  onAddToMarketplace: vi.fn(),
  handleProductsTableRender: vi.fn(),
  tableColumns: getProductColumns(),
  getRowClassName: undefined,
  getRowId: (row) => row.id,
  skeletonRows: null,
  maxHeight: undefined,
  stickyHeader: false,
  productNameKey: 'name_en',
  priceGroups: [],
  onPrefetchProductDetail: vi.fn(),
  onProductNameClick: vi.fn(),
  onProductEditClick: vi.fn(),
  onProductDeleteClick: vi.fn(),
  onDuplicateProduct: vi.fn(),
  onIntegrationsClick: vi.fn(),
  onExportSettingsClick: vi.fn(),
  integrationBadgeIds: new Set(),
  integrationBadgeStatuses: new Map(),
  traderaBadgeIds: new Set(),
  traderaBadgeStatuses: new Map(),
  playwrightProgrammableBadgeIds: new Set(),
  playwrightProgrammableBadgeStatuses: new Map(),
  queuedProductIds: new Set(),
  productAiRunStatusByProductId: new Map(),
  categoryNameById: new Map(),
  thumbnailSource: 'file',
  imageExternalBaseUrl: '',
  isCreateOpen: false,
  isPromptOpen: false,
  setIsPromptOpen: vi.fn(),
  handleConfirmSku: vi.fn().mockResolvedValue(undefined),
  initialSku: '',
  createDraft: null,
  initialCatalogId: null,
  onCloseCreate: vi.fn(),
  onCreateSuccess: vi.fn(),
  editingProduct: null,
  onCloseEdit: vi.fn(),
  onEditSuccess: vi.fn(),
  onEditSave: vi.fn(),
  integrationsProduct: null,
  integrationsRecoveryContext: null,
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
  ...overrides,
});

const renderProductTable = (
  overrides: Partial<ProductListContextType> = {}
): ProductListContextType => {
  const contextValue = buildContextValue(overrides);

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ProductListProvider value={contextValue}>
          <DataTable
            columns={contextValue.tableColumns}
            data={contextValue.data}
            getRowId={contextValue.getRowId}
            rowSelection={contextValue.rowSelection}
            onRowSelectionChange={contextValue.setRowSelection}
            isLoading={contextValue.isLoading}
            skeletonRows={contextValue.skeletonRows}
            getRowClassName={contextValue.getRowClassName}
            maxHeight={contextValue.maxHeight}
            stickyHeader={contextValue.stickyHeader}
            meta={{ currencyCode: contextValue.currencyCode }}
          />
        </ProductListProvider>
      </ToastProvider>
    </QueryClientProvider>
  );

  return contextValue;
};

const clickFirstOneClickExport = async (): Promise<void> => {
  const user = userEvent.setup();
  const quickExportButtons = await screen.findAllByLabelText('One-click export to Base.com');
  await user.click(quickExportButtons[0]!);
};

describe('Admin Products List UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    queryClient.setQueryData(QUERY_KEYS.userPreferences.all, {
      productListNameLocale: 'name_en',
      productListCatalogFilter: 'all',
      productListCurrencyCode: 'USD',
      productListPageSize: 24,
      productListThumbnailSource: 'file',
      productListFiltersCollapsedByDefault: false,
    });

    server.use(
      http.get('/api/v2/products', () => {
        return HttpResponse.json(mockProducts);
      }),
      http.get('/api/v2/products/count', () => {
        return HttpResponse.json({ count: mockProducts.length });
      }),
      http.get('/api/v2/products/entities/catalogs', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/v2/products/validator-config', () => HttpResponse.json([])),
      http.get('/api/v2/integrations/with-connections', () => HttpResponse.json([])),
      http.get('/api/v2/integrations/exports/base/default-connection', () =>
        HttpResponse.json({ connectionId: null })
      ),
      http.get('/api/v2/integrations/products/:id/listings', () => HttpResponse.json([])),
      http.get('/api/ai-paths/trigger-buttons', () => HttpResponse.json([])),
      http.post('/api/query-telemetry', () => HttpResponse.json({ ok: true })),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true }))
    );
  });

  it('renders product rows', async () => {
    renderProductTable();

    expect(await screen.findByText('Product Alpha')).toBeInTheDocument();
    expect(screen.getByText('Product Beta')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Open row actions')).toHaveLength(2);
  });

  it('renders accessible utility-column controls', async () => {
    renderProductTable();

    expect(await screen.findByRole('button', { name: 'Show trigger run pills' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('shows row actions menu with Edit, Duplicate, and Remove', async () => {
    const contextValue = renderProductTable();

    const user = userEvent.setup();
    const actionButtons = screen.getAllByLabelText('Open row actions');
    await user.click(actionButtons[0]!);

    const editAction = await screen.findByRole('menuitem', { name: 'Edit' });
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toBeInTheDocument();

    await user.click(editAction);
    expect(contextValue.onProductEditClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1' })
    );
  });

  it('prompts for SKU before opening the create modal and pre-fills SKU', async () => {
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminLayoutProvider>
            <AdminProductsPage />
          </AdminLayoutProvider>
        </ToastProvider>
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    const createButtons = await within(view.container).findAllByLabelText('Create new product');
    await user.click(createButtons[0]!);

    // Interact with PromptModal
    const promptModal = await screen.findByRole('dialog', { name: /Create New Product/i });
    const promptInput = within(promptModal).getByRole('textbox');
    await user.type(promptInput, 'abc123');
    await user.click(within(promptModal).getByRole('button', { name: /Confirm/i }));

    // Wait for Product Form Modal and pre-filled SKU
    // We skip waiting for the heading because AppModal renders it twice (visible + sr-only), causing ambiguity
    await waitFor(() => {
      const skuInput = document.getElementById('sku') as HTMLInputElement;
      expect(skuInput).toBeInTheDocument();
      expect(skuInput.value).toBe('ABC123');
    });
  });

  it('repairs a missing OneClick inventory when the connection exposes a default inventory', async () => {
    let exportCalls = 0;
    let exportPayload: Record<string, unknown> | null = null;
    server.use(
      http.get('/api/v2/integrations/exports/base/default-connection', () =>
        HttpResponse.json({ connectionId: 'base-conn-1' })
      ),
      http.get('/api/v2/integrations/exports/base/default-inventory', () =>
        HttpResponse.json({ inventoryId: null })
      ),
      http.post('/api/v2/integrations/imports/base', async () =>
        HttpResponse.json({
          inventories: [{ id: 'inv-1', name: 'Inventory 1', is_default: true }],
        })
      ),
      http.get('/api/v2/integrations/exports/base/active-template', () =>
        HttpResponse.json({ templateId: null })
      ),
      http.post('/api/v2/integrations/exports/base/default-inventory', async () =>
        HttpResponse.json({ inventoryId: 'inv-1' })
      ),
      http.post('http://localhost/api/v2/integrations/products/:id/base/sku-check', () =>
        HttpResponse.json({ exists: false })
      ),
      http.post('/api/v2/integrations/products/:id/export-to-base', async ({ request }) => {
        exportCalls += 1;
        exportPayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true });
      }),
      http.get('/api/v2/integrations/products/:id/listings', () => HttpResponse.json([]))
    );

    renderProductTable();
    await clickFirstOneClickExport();

    await waitFor(() => {
      expect(exportCalls).toBe(1);
    });
    expect(exportPayload).toMatchObject({
      connectionId: 'base-conn-1',
      inventoryId: 'inv-1',
    });
  });

  it('shows notification and blocks OneClick export when configured inventory is not available for connection', async () => {
    let inventoryImportCalls = 0;
    let exportCalls = 0;
    server.use(
      http.get('/api/v2/integrations/exports/base/default-connection', () =>
        HttpResponse.json({ connectionId: 'base-conn-1' })
      ),
      http.get('/api/v2/integrations/exports/base/default-inventory', () =>
        HttpResponse.json({ inventoryId: 'inv-missing' })
      ),
      http.post('/api/v2/integrations/imports/base', async () => {
        inventoryImportCalls += 1;
        return HttpResponse.json({
          inventories: [
            { id: 'inv-1', name: 'Inventory 1', is_default: false },
            { id: 'inv-2', name: 'Inventory 2', is_default: false },
          ],
        });
      }),
      http.post('/api/v2/integrations/products/:id/export-to-base', () => {
        exportCalls += 1;
        return HttpResponse.json({ success: true });
      })
    );

    renderProductTable();
    await clickFirstOneClickExport();

    await waitFor(() => {
      expect(inventoryImportCalls).toBe(1);
    });
    expect(exportCalls).toBe(0);
  });

  it('uses scoped active template with explicit connection and inventory for OneClick export', async () => {
    let capturedTemplateScope: { connectionId: string; inventoryId: string } | null = null;
    let exportPayload: Record<string, unknown> | null = null;

    server.use(
      http.get('/api/v2/integrations/exports/base/default-connection', () =>
        HttpResponse.json({ connectionId: 'base-conn-1' })
      ),
      http.get('/api/v2/integrations/exports/base/default-inventory', () =>
        HttpResponse.json({ inventoryId: 'inv-1' })
      ),
      http.post('/api/v2/integrations/imports/base', async () =>
        HttpResponse.json({
          inventories: [{ id: 'inv-1', name: 'Inventory 1', is_default: true }],
        })
      ),
      http.get('/api/v2/integrations/exports/base/active-template', ({ request }) => {
        const url = new URL(request.url);
        capturedTemplateScope = {
          connectionId: url.searchParams.get('connectionId') ?? '',
          inventoryId: url.searchParams.get('inventoryId') ?? '',
        };
        return HttpResponse.json({ templateId: 'tpl-1' });
      }),
      http.post('/api/v2/integrations/products/:id/export-to-base', async ({ request }) => {
        exportPayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true });
      }),
      http.post('http://localhost/api/v2/integrations/products/:id/base/sku-check', () => {
        return HttpResponse.json({ exists: false });
      }),
      http.get('/api/v2/integrations/products/:id/listings', () => HttpResponse.json([]))
    );

    renderProductTable();
    await clickFirstOneClickExport();

    await waitFor(() => {
      expect(exportPayload).not.toBeNull();
    });
    expect(capturedTemplateScope).toEqual({
      connectionId: 'base-conn-1',
      inventoryId: 'inv-1',
    });
    expect(exportPayload).toMatchObject({
      connectionId: 'base-conn-1',
      inventoryId: 'inv-1',
      templateId: 'tpl-1',
    });
  });

  it('opens integration recovery options instead of auto-exporting when the Base badge is failed', async () => {
    let exportCalls = 0;
    const onIntegrationsClick = vi.fn();
    window.sessionStorage.setItem(
      'base-quick-export-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          runId: 'run-failed-recovery',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    server.use(
      http.post('/api/v2/integrations/products/:id/export-to-base', () => {
        exportCalls += 1;
        return HttpResponse.json({ success: true });
      })
    );

    renderProductTable({
      onIntegrationsClick,
    });

    const user = userEvent.setup();
    const recoveryButton = await screen.findByRole('button', {
      name: 'Open Base.com recovery options (failed).',
    });
    await user.click(recoveryButton);

    expect(onIntegrationsClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1' }),
      {
        source: 'base_quick_export_failed',
        integrationSlug: 'baselinker',
        status: 'failed',
        runId: 'run-failed-recovery',
      },
      'baselinker'
    );
    expect(exportCalls).toBe(0);
  });

  it('opens the Base listings modal instead of re-exporting when the Base badge is green', async () => {
    let exportCalls = 0;
    const onIntegrationsClick = vi.fn();

    server.use(
      http.post('/api/v2/integrations/products/:id/export-to-base', () => {
        exportCalls += 1;
        return HttpResponse.json({ success: true });
      })
    );

    renderProductTable({
      onIntegrationsClick,
      data: [
        {
          ...mockProducts[0],
          baseProductId: 'base-123',
        } as ProductWithImages,
        mockProducts[1]!,
      ],
    });

    const user = userEvent.setup();
    const manageButton = await screen.findByRole('button', {
      name: 'Manage Base.com listing (active).',
    });
    await user.click(manageButton);

    expect(onIntegrationsClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1' }),
      undefined,
      'baselinker'
    );
    expect(exportCalls).toBe(0);
  });
});
