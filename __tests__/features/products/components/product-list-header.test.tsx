import React from 'react';
import { vi } from 'vitest';

import { ProductListHeader } from '@/features/products/components/list/ProductListHeader';
import { ProductListProvider } from '@/features/products/context/ProductListContext';
import type { ProductListContextType } from '@/features/products/context/ProductListContext';

import { render, screen, fireEvent } from '../../../test-utils';

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  };
});

describe('ProductListHeader Component', () => {
  const mockContextValue: ProductListContextType = {
    onCreateProduct: vi.fn(),
    onCreateFromDraft: vi.fn(),
    activeDrafts: [],
    page: 1,
    totalPages: 5,
    setPage: vi.fn(),
    pageSize: 24,
    setPageSize: vi.fn(),
    nameLocale: 'name_en' as const,
    setNameLocale: vi.fn(),
    languageOptions: [
      { value: 'name_en' as const, label: 'English' },
      { value: 'name_pl' as const, label: 'Polish' },
      { value: 'name_de' as const, label: 'German' },
    ],
    currencyCode: 'USD',
    setCurrencyCode: vi.fn(),
    currencyOptions: ['USD', 'PLN', 'EUR'],
    filtersCollapsedByDefault: true,
    catalogFilter: 'all',
    setCatalogFilter: vi.fn(),
    catalogs: [
      {
        id: 'cat-1',
        name: 'Catalog 1',
        description: null,
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        languageIds: ['en'],
        priceGroupIds: ['pg-1'],
        defaultLanguageId: null,
        defaultPriceGroupId: null,
      },
      {
        id: 'cat-2',
        name: 'Catalog 2',
        description: null,
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        languageIds: ['en'],
        priceGroupIds: ['pg-1'],
        defaultLanguageId: null,
        defaultPriceGroupId: null,
      },
    ],
    // Stubs for fields not tested by this component
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
    data: [],
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
    getRowId: (row) => row.id,
    skeletonRows: null,
    productNameKey: 'name_en',
    priceGroups: [],
    onProductNameClick: vi.fn(),
    onProductEditClick: vi.fn(),
    onProductDeleteClick: vi.fn(),
    onIntegrationsClick: vi.fn(),
    onExportSettingsClick: vi.fn(),
    integrationBadgeIds: new Set(),
    integrationBadgeStatuses: new Map(),
    traderaBadgeIds: new Set(),
    traderaBadgeStatuses: new Map(),
    queuedProductIds: new Set(),
    isCreateOpen: false,
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
  };

  const renderWithContext = (ui: React.ReactNode, contextValue = mockContextValue) => {
    return render(
      <ProductListProvider value={contextValue}>
        {ui}
      </ProductListProvider>
    );
  };

  it('renders title and buttons', () => {
    renderWithContext(<ProductListHeader />);

    expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Create new product')).toBeInTheDocument();
  });

  it('calls onCreateProduct when create button is clicked', () => {
    renderWithContext(<ProductListHeader />);
    fireEvent.click(screen.getByLabelText('Create new product'));
    expect(mockContextValue.onCreateProduct).toHaveBeenCalled();
  });

  it('renders pagination info correctly', () => {
    renderWithContext(<ProductListHeader />);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('calls setPage when Prev/Next buttons are clicked', () => {
    // Override page to 2 for this test to enable 'Previous' button logic if needed,
    // though Pagination component might handle disabled states.
    // Here we just check calls.
    renderWithContext(<ProductListHeader />, { ...mockContextValue, page: 2 });
    
    // Check for previous button. Note: The exact label/text depends on the Pagination component implementation.
    // Assuming standard accessible labels or text.
    const [prevButton] = screen.getAllByLabelText('Previous page'); // Adjust selector if needed based on Pagination component
    if (!prevButton) {
      throw new Error('Expected a previous page button');
    }
    fireEvent.click(prevButton);
    expect(mockContextValue.setPage).toHaveBeenCalledWith(1);

    const [nextButton] = screen.getAllByLabelText('Next page'); // Adjust selector if needed
    if (!nextButton) {
      throw new Error('Expected a next page button');
    }
    fireEvent.click(nextButton);
    expect(mockContextValue.setPage).toHaveBeenCalledWith(3);
  });
});
