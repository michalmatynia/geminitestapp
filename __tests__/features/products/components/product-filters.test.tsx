import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  ProductFilters,
  ProductSelectionActions,
} from '@/features/products/components/list/ProductFilters';
import {
  ProductListProvider,
  type ProductListContextType,
} from '@/features/products/context/ProductListContext';
import type { ProductListPreferences } from '@/shared/contracts/products';
import { ToastProvider } from '@/shared/ui/toast';

let mockPreferences: ProductListPreferences = {
  nameLocale: 'name_en',
  catalogFilter: 'all',
  currencyCode: 'PLN',
  pageSize: 12,
  thumbnailSource: 'file',
  filtersCollapsedByDefault: false,
  advancedFilterPresets: [],
  appliedAdvancedFilter: '',
  appliedAdvancedFilterPresetId: null,
};
const setAdvancedFilterPresetsMock = vi.fn(async () => undefined);
const setAppliedAdvancedFilterStateMock = vi.fn(async () => undefined);

vi.mock('@/features/products/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: mockPreferences,
    loading: false,
    setNameLocale: vi.fn(),
    setCatalogFilter: vi.fn(),
    setCurrencyCode: vi.fn(),
    setPageSize: vi.fn(),
    setAdvancedFilterPresets: setAdvancedFilterPresetsMock,
    setAppliedAdvancedFilterState: setAppliedAdvancedFilterStateMock,
  }),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCategories: () => ({ data: [] }),
  useCatalogs: () => ({ data: [] }),
  useMultiTags: () => [],
  useTags: () => ({ data: [] }),
  useProducers: () => ({ data: [] }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('ProductFilters Component', () => {
  beforeEach(() => {
    mockPreferences = {
      nameLocale: 'name_en',
      catalogFilter: 'all',
      currencyCode: 'PLN',
      pageSize: 12,
      thumbnailSource: 'file',
      filtersCollapsedByDefault: false,
      advancedFilterPresets: [],
      appliedAdvancedFilter: '',
      appliedAdvancedFilterPresetId: null,
    };
    setAdvancedFilterPresetsMock.mockClear();
    setAppliedAdvancedFilterStateMock.mockClear();
  });

  const mockContextValue: Partial<ProductListContextType> = {
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
    catalogFilter: 'all',
    nameLocale: 'name_en',
    baseExported: '',
    setBaseExported: vi.fn(),
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
    advancedFilterPresets: [],
    setAdvancedFilterPresets: vi.fn(),
    setAdvancedFilter: vi.fn(),
    setAdvancedFilterState: vi.fn(),
    filtersCollapsedByDefault: false,
    catalogs: [],
    data: [],
    rowSelection: {},
    setRowSelection: vi.fn(),
    onSelectAllGlobal: vi.fn(async () => undefined),
    loadingGlobal: false,
    onDeleteSelected: vi.fn(async () => undefined),
    onAddToMarketplace: vi.fn(),
  };

  const renderWithProviders = (contextValue: Partial<ProductListContextType>) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductListProvider value={contextValue as ProductListContextType}>
          <ProductFilters />
        </ProductListProvider>
      </QueryClientProvider>
    );
  };

  it('renders all filter inputs', () => {
    renderWithProviders(mockContextValue);

    expect(screen.getByPlaceholderText('Search by product name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by product ID...')).toBeInTheDocument();
    expect(screen.getByLabelText('ID Match')).toBeInTheDocument();
    expect(screen.getByText('Choose match mode')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by SKU...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/min price/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/max price/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('From')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('To')).toBeInTheDocument();
  });

  it('calls setProductId when Product ID input changes', async () => {
    renderWithProviders(mockContextValue);
    const input = screen.getByPlaceholderText('Search by product ID...');
    fireEvent.change(input, { target: { value: 'cma123' } });
    await waitFor(() => expect(mockContextValue.setProductId).toHaveBeenCalledWith('cma123'), {
      timeout: 1000,
    });
  });

  it('calls setSearch when name input changes', async () => {
    renderWithProviders(mockContextValue);
    const input = screen.getByPlaceholderText('Search by product name...');
    fireEvent.change(input, { target: { value: 'laptop' } });
    await waitFor(() => expect(mockContextValue.setSearch).toHaveBeenCalledWith('laptop'), {
      timeout: 1000,
    });
  });

  it('calls setSku when SKU input changes', async () => {
    renderWithProviders(mockContextValue);
    const input = screen.getByPlaceholderText('Search by SKU...');
    fireEvent.change(input, { target: { value: 'ABC' } });
    await waitFor(() => expect(mockContextValue.setSku).toHaveBeenCalledWith('ABC'), {
      timeout: 1000,
    });
  });

  it('does not count default ID match mode as an active filter when Product ID is empty', () => {
    renderWithProviders({
      ...mockContextValue,
      productId: '',
      idMatchMode: 'exact',
    });

    expect(screen.getByRole('button', { name: /^Hide Filters$/i })).toBeInTheDocument();
    expect(screen.queryByText(/filter active/i)).not.toBeInTheDocument();
  });

  it('shows active preset pill and clears it on close click', () => {
    const setAdvancedFilterState = vi.fn();
    mockPreferences = {
      ...mockPreferences,
      advancedFilterPresets: [
        {
          id: 'preset-1',
          name: 'Price + Stock',
          filter: {
            type: 'group',
            id: 'group-1',
            combinator: 'and',
            not: false,
            rules: [
              {
                type: 'condition',
                id: 'condition-1',
                field: 'name',
                operator: 'contains',
                value: 'alpha',
              },
            ],
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      appliedAdvancedFilter: '',
      appliedAdvancedFilterPresetId: 'preset-1',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ProductListProvider
            value={{
              ...(mockContextValue as ProductListContextType),
              activeAdvancedFilterPresetId: 'preset-1',
              advancedFilterPresets: mockPreferences.advancedFilterPresets,
              setAdvancedFilterState,
            }}
          >
            <ProductSelectionActions />
          </ProductListProvider>
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Price + Stock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Price + Stock' }));
    expect(setAdvancedFilterState).toHaveBeenCalledWith('', null);
  });

  it('applies preset when preset name is clicked from Filter Presets menu', async () => {
    const setAdvancedFilterState = vi.fn();
    const user = userEvent.setup();
    const presetFilter = {
      type: 'group' as const,
      id: 'group-apply',
      combinator: 'and' as const,
      not: false,
      rules: [
        {
          type: 'condition' as const,
          id: 'condition-apply',
          field: 'stock' as const,
          operator: 'gt' as const,
          value: 5,
        },
      ],
    };

    mockPreferences = {
      ...mockPreferences,
      advancedFilterPresets: [
        {
          id: 'preset-apply',
          name: 'Stock > 5',
          filter: presetFilter,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ProductListProvider
            value={{
              ...(mockContextValue as ProductListContextType),
              advancedFilterPresets: mockPreferences.advancedFilterPresets,
              setAdvancedFilterState,
            }}
          >
            <ProductSelectionActions />
          </ProductListProvider>
        </ToastProvider>
      </QueryClientProvider>
    );

    const filterPresetsTrigger = screen.getAllByText('Filter Presets')[0]?.closest('button');
    if (!filterPresetsTrigger) {
      throw new Error('Expected Filter Presets trigger button');
    }
    await user.click(filterPresetsTrigger);

    await user.click(await screen.findByText('Stock > 5'));
    expect(setAdvancedFilterState).toHaveBeenCalledWith(
      JSON.stringify(presetFilter),
      'preset-apply'
    );
  });
});
