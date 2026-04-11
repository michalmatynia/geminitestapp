// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  filterPanelMock,
  useCatalogsMock,
  useProductCategoriesForCatalogsMock,
  useMultiTagsMock,
  useProductCategoriesMock,
  useProductListFiltersContextMock,
  useProducersMock,
  useTagsMock,
} = vi.hoisted(() => ({
  filterPanelMock: vi.fn(),
  useCatalogsMock: vi.fn(),
  useProductCategoriesForCatalogsMock: vi.fn(),
  useMultiTagsMock: vi.fn(),
  useProductCategoriesMock: vi.fn(),
  useProductListFiltersContextMock: vi.fn(),
  useProducersMock: vi.fn(),
  useTagsMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', () => ({
  useProductListFiltersContext: () => useProductListFiltersContextMock(),
}));

vi.mock('@/features/products/hooks/useCategoryQueries', () => ({
  useProductCategories: (...args: unknown[]) => useProductCategoriesMock(...args),
  useProductCategoriesForCatalogs: (...args: unknown[]) =>
    useProductCategoriesForCatalogsMock(...args),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCatalogs: (...args: unknown[]) => useCatalogsMock(...args),
  useMultiTags: (...args: unknown[]) => useMultiTagsMock(...args),
  useProducers: (...args: unknown[]) => useProducersMock(...args),
  useTags: (...args: unknown[]) => useTagsMock(...args),
}));

vi.mock('@/features/products/components/list/advanced-filter', () => ({
  AdvancedFilterModal: () => <div data-testid='advanced-filter-modal' />,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    className,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/templates/FilterPanel', () => ({
  FilterPanel: (props: Record<string, unknown>) => {
    filterPanelMock(props);
    return <div data-testid='filter-panel'>{props.actions as React.ReactNode}</div>;
  },
}));

import { ProductFilters } from './ProductFilters';

const buildFiltersContextValue = (
  overrides: Partial<ReturnType<typeof useProductListFiltersContextMock>> = {}
) => ({
  search: '',
  setSearch: vi.fn(),
  productId: '',
  setProductId: vi.fn(),
  idMatchMode: 'exact' as const,
  setIdMatchMode: vi.fn(),
  sku: '',
  setSku: vi.fn(),
  description: '',
  setDescription: vi.fn(),
  categoryId: '',
  setCategoryId: vi.fn(),
  nameLocale: 'name_en' as const,
  catalogFilter: 'all',
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
  advancedFilterPresets: [],
  setAdvancedFilterPresets: vi.fn(),
  setAdvancedFilterState: vi.fn(),
  baseExported: '',
  setBaseExported: vi.fn(),
  includeArchived: false,
  setIncludeArchived: vi.fn(),
  filtersCollapsedByDefault: false,
  ...overrides,
});

describe('ProductFilters layout contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductListFiltersContextMock.mockReturnValue(buildFiltersContextValue());
    useProductCategoriesMock.mockReturnValue({ data: [] });
    useProductCategoriesForCatalogsMock.mockReturnValue({ data: [] });
    useCatalogsMock.mockReturnValue({ data: [] });
    useTagsMock.mockReturnValue({ data: [] });
    useMultiTagsMock.mockReturnValue([]);
    useProducersMock.mockReturnValue({ data: [] });
  });

  it('passes the current Products list layout props into FilterPanel', () => {
    render(<ProductFilters />);

    const filterPanelProps = filterPanelMock.mock.lastCall?.[0] as Record<string, unknown>;
    expect(filterPanelProps).toMatchObject({
      searchPlaceholder: 'Search by product name...',
      collapsible: true,
      defaultExpanded: true,
      toggleButtonAlignment: 'start',
      showHeader: false,
    });
    expect(filterPanelProps.values).toMatchObject({
      includeArchived: false,
    });
    expect(filterPanelProps.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'includeArchived',
          label: 'Show Archived',
          type: 'checkbox',
        }),
      ])
    );

    const advancedFilterButton = screen.getByRole('button', { name: 'Advanced Filter' });
    expect(advancedFilterButton.className).toContain('h-8 w-full sm:w-auto');
  });

  it('keeps the saved collapsed preference wired into the layout defaults', () => {
    useProductListFiltersContextMock.mockReturnValue(
      buildFiltersContextValue({ filtersCollapsedByDefault: true })
    );

    render(<ProductFilters />);

    const filterPanelProps = filterPanelMock.mock.lastCall?.[0] as Record<string, unknown>;
    expect(filterPanelProps.defaultExpanded).toBe(false);
    expect(useProductCategoriesMock).toHaveBeenCalledWith(undefined, { enabled: false });
    expect(useProductCategoriesForCatalogsMock).toHaveBeenCalledWith([], { enabled: false });
    expect(useCatalogsMock).toHaveBeenCalledWith({ enabled: false });
    expect(useTagsMock).toHaveBeenCalledWith(undefined, { enabled: false });
    expect(useMultiTagsMock).toHaveBeenCalledWith([], { enabled: false });
    expect(useProducersMock).toHaveBeenCalledWith({ enabled: false });
  });

  it('passes a deterministic id base when rendered for a specific layout instance', () => {
    render(<ProductFilters instanceId='mobile' />);

    const filterPanelProps = filterPanelMock.mock.lastCall?.[0] as Record<string, unknown>;
    expect(filterPanelProps.idBase).toBe('products-mobile');
  });

  it('enables metadata queries when the advanced filter modal opens from a collapsed panel', async () => {
    useProductListFiltersContextMock.mockReturnValue(
      buildFiltersContextValue({ filtersCollapsedByDefault: true })
    );

    render(<ProductFilters />);

    fireEvent.click(screen.getByRole('button', { name: 'Advanced Filter' }));

    await waitFor(() => {
      expect(useCatalogsMock).toHaveBeenLastCalledWith({ enabled: true });
      expect(useTagsMock).toHaveBeenLastCalledWith(undefined, { enabled: true });
      expect(useMultiTagsMock).toHaveBeenLastCalledWith([], { enabled: true });
      expect(useProducersMock).toHaveBeenLastCalledWith({ enabled: true });
      expect(screen.getByTestId('advanced-filter-modal')).toBeInTheDocument();
    });
  });

  it('stays renderable when metadata hooks return malformed cached payloads', () => {
    useCatalogsMock.mockReturnValue({ data: { invalid: true } });
    useTagsMock.mockReturnValue({ data: { invalid: true } });
    useMultiTagsMock.mockReturnValue([{ data: { invalid: true } }]);
    useProducersMock.mockReturnValue({ data: { invalid: true } });
    useProductCategoriesMock.mockReturnValue({ data: { invalid: true } });
    useProductCategoriesForCatalogsMock.mockReturnValue({ data: { invalid: true } });

    render(<ProductFilters />);

    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
  });

  it('builds category options across all catalogs when Product List is scoped to all catalogs', () => {
    useCatalogsMock.mockReturnValue({
      data: [
        { id: 'catalog-1', name: 'Catalog One' },
        { id: 'catalog-2', name: 'Catalog Two' },
      ],
    });
    useProductCategoriesForCatalogsMock.mockReturnValue({
      data: [
        {
          id: 'cat-1',
          catalogId: 'catalog-1',
          name: 'Keychains',
          name_en: 'Keychains',
          name_pl: 'Breloki',
          name_de: null,
          color: null,
          parentId: null,
        },
        {
          id: 'cat-2',
          catalogId: 'catalog-2',
          name: 'Keychains',
          name_en: 'Keychains',
          name_pl: 'Breloki',
          name_de: null,
          color: null,
          parentId: null,
        },
        {
          id: 'cat-3',
          catalogId: 'catalog-2',
          name: 'Stickers',
          name_en: 'Stickers',
          name_pl: 'Naklejki',
          name_de: null,
          color: null,
          parentId: null,
        },
      ],
    });

    render(<ProductFilters />);

    const filterPanelProps = filterPanelMock.mock.lastCall?.[0] as {
      filters: Array<{
        key: string;
        options?: Array<{ value: string; label: string }>;
      }>;
    };
    const categoryFilter = filterPanelProps.filters.find((field) => field.key === 'categoryId');

    expect(useProductCategoriesForCatalogsMock).toHaveBeenCalledWith(
      ['catalog-1', 'catalog-2'],
      { enabled: true }
    );
    expect(categoryFilter?.options).toEqual(
      expect.arrayContaining([
        { value: '__all__', label: 'All categories' },
        { value: 'cat-1', label: 'Keychains (Catalog One)' },
        { value: 'cat-2', label: 'Keychains (Catalog Two)' },
        { value: 'cat-3', label: 'Stickers' },
      ])
    );
  });

  it('maps category option selection back to setCategoryId', () => {
    const setCategoryId = vi.fn();
    useProductListFiltersContextMock.mockReturnValue(
      buildFiltersContextValue({ setCategoryId })
    );

    render(<ProductFilters />);

    const filterPanelProps = filterPanelMock.mock.lastCall?.[0] as {
      onFilterChange: (key: string, value: unknown) => void;
    };

    filterPanelProps.onFilterChange('categoryId', 'cat-123');
    filterPanelProps.onFilterChange('categoryId', '__all__');

    expect(setCategoryId).toHaveBeenNthCalledWith(1, 'cat-123');
    expect(setCategoryId).toHaveBeenNthCalledWith(2, '');
  });
});
