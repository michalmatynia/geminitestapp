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
import {
  ProductListProvider,
  type ProductListContextType,
} from '@/features/products/context/ProductListContext';
import { server } from '@/mocks/server';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { DataTable } from '@/shared/ui';
import { ToastProvider } from '@/shared/ui/toast';


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
}));

vi.mock('@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: () => null,
}));

const mockProducts = [
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
    name: 'Product Alpha',
    description: '',
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
  },
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
    name: 'Product Beta',
    description: '',
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
  },
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
  startDate: '',
  setStartDate: vi.fn(),
  endDate: '',
  setEndDate: vi.fn(),
  baseExported: '',
  setBaseExported: vi.fn(),
  data: mockProducts as any,
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
  tableColumns: getProductColumns('file', null, new Map()),
  getRowClassName: undefined,
  getRowId: (row) => row.id,
  skeletonRows: null,
  maxHeight: undefined,
  stickyHeader: false,
  productNameKey: 'name_en',
  priceGroups: [],
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
  queuedProductIds: new Set(),
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
      http.get('/api/products', () => {
        return HttpResponse.json(mockProducts);
      }),
      http.get('/api/products/count', () => {
        return HttpResponse.json({ count: mockProducts.length });
      }),
      http.get('/api/catalogs', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/products/validator-config', () => HttpResponse.json([])),
      http.get('/api/integrations/with-connections', () => HttpResponse.json([])),
      http.get('/api/integrations/exports/base/default-connection', () => HttpResponse.json({ connectionId: null })),
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
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminProductsPage />
        </ToastProvider>
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    const createButtons = await screen.findAllByLabelText('Create new product');
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
});
