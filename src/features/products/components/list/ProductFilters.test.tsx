// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  filterPanelMock,
  useCatalogsMock,
  useMultiTagsMock,
  useProductCategoriesMock,
  useProductListFiltersContextMock,
  useProducersMock,
  useTagsMock,
  useUserPreferencesMock,
} = vi.hoisted(() => ({
  filterPanelMock: vi.fn(),
  useCatalogsMock: vi.fn(),
  useMultiTagsMock: vi.fn(),
  useProductCategoriesMock: vi.fn(),
  useProductListFiltersContextMock: vi.fn(),
  useProducersMock: vi.fn(),
  useTagsMock: vi.fn(),
  useUserPreferencesMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', () => ({
  useProductListFiltersContext: () => useProductListFiltersContextMock(),
}));

vi.mock('@/features/products/hooks/useCategoryQueries', () => ({
  useProductCategories: () => useProductCategoriesMock(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCatalogs: () => useCatalogsMock(),
  useMultiTags: () => useMultiTagsMock(),
  useProducers: () => useProducersMock(),
  useTags: () => useTagsMock(),
}));

vi.mock('@/features/products/hooks/useUserPreferences', () => ({
  useUserPreferences: () => useUserPreferencesMock(),
}));

vi.mock('@/features/products/components/list/advanced-filter', () => ({
  AdvancedFilterModal: () => <div data-testid='advanced-filter-modal' />,
}));

vi.mock('@/shared/ui/templates/FilterPanel', () => ({
  FilterPanel: (props: Record<string, unknown>) => {
    filterPanelMock(props);
    return <div data-testid='filter-panel'>{props.actions as React.ReactNode}</div>;
  },
}));

vi.mock('@/shared/ui', () => ({
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
  setAdvancedFilterState: vi.fn(),
  baseExported: '',
  setBaseExported: vi.fn(),
  filtersCollapsedByDefault: false,
  ...overrides,
});

describe('ProductFilters layout contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductListFiltersContextMock.mockReturnValue(buildFiltersContextValue());
    useProductCategoriesMock.mockReturnValue({ data: [] });
    useCatalogsMock.mockReturnValue({ data: [] });
    useTagsMock.mockReturnValue({ data: [] });
    useMultiTagsMock.mockReturnValue([]);
    useProducersMock.mockReturnValue({ data: [] });
    useUserPreferencesMock.mockReturnValue({
      preferences: { advancedFilterPresets: [] },
      setAdvancedFilterPresets: vi.fn(),
    });
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
  });

  it('passes a deterministic id base when rendered for a specific layout instance', () => {
    render(<ProductFilters instanceId='mobile' />);

    const filterPanelProps = filterPanelMock.mock.lastCall?.[0] as Record<string, unknown>;
    expect(filterPanelProps.idBase).toBe('products-mobile');
  });
});
