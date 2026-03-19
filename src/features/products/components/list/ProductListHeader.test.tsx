// @vitest-environment jsdom

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductListHeaderActionsContextMock,
  useProductListFiltersContextMock,
  useAdminLayoutStateMock,
  useAdminLayoutActionsMock,
} = vi.hoisted(() => ({
  useProductListHeaderActionsContextMock: vi.fn(),
  useProductListFiltersContextMock: vi.fn(),
  useAdminLayoutStateMock: vi.fn(),
  useAdminLayoutActionsMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicStub(props: Record<string, unknown>): React.JSX.Element {
      return <div data-testid='trigger-button-bar' data-location={String(props['location'])} />;
    },
}));

vi.mock('@/features/products/context/ProductListContext', () => ({
  useProductListHeaderActionsContext: () => useProductListHeaderActionsContextMock(),
  useProductListFiltersContext: () => useProductListFiltersContextMock(),
}));

vi.mock('@/shared/providers/AdminLayoutProvider', () => ({
  useAdminLayoutState: () => useAdminLayoutStateMock(),
  useAdminLayoutActions: () => useAdminLayoutActionsMock(),
}));

vi.mock('@/shared/ui', () => ({
  AdminProductsBreadcrumbs: () => <nav>Breadcrumbs</nav>,
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  SelectSimple: ({
    ariaLabel,
    value,
    onValueChange,
  }: {
    ariaLabel?: string;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value={value}>{value}</option>
    </select>
  ),
  Pagination: () => <div>Pagination</div>,
}));

import { ProductListHeader } from './ProductListHeader';

const findDivByExactClassName = (
  root: ParentNode,
  expectedClassName: string
): HTMLDivElement => {
  const match = Array.from(root.querySelectorAll('div')).find(
    (element): element is HTMLDivElement =>
      element instanceof HTMLDivElement && element.className === expectedClassName
  );
  if (!match) {
    throw new Error(`Expected div with className "${expectedClassName}"`);
  }
  return match;
};

describe('ProductListHeader', () => {
  beforeEach(() => {
    useAdminLayoutStateMock.mockReturnValue({ isMenuHidden: false });
    useAdminLayoutActionsMock.mockReturnValue({ setIsMenuHidden: vi.fn() });
    useProductListHeaderActionsContextMock.mockReturnValue({
      onCreateProduct: vi.fn(),
      onCreateFromDraft: vi.fn(),
      activeDrafts: [],
    });
    useProductListFiltersContextMock.mockReturnValue({
      page: 1,
      totalPages: 1,
      setPage: vi.fn(),
      pageSize: 12,
      setPageSize: vi.fn(),
      nameLocale: 'name_en',
      setNameLocale: vi.fn(),
      languageOptions: [{ value: 'name_en', label: 'English' }],
      currencyCode: 'PLN',
      setCurrencyCode: vi.fn(),
      currencyOptions: ['PLN'],
      catalogFilter: 'all',
      setCatalogFilter: vi.fn(),
      catalogs: [],
    });
  });

  it('does not render the show statuses button in the header', () => {
    useProductListHeaderActionsContextMock.mockReturnValue({
      onCreateProduct: vi.fn(),
      onCreateFromDraft: vi.fn(),
      activeDrafts: [],
    });

    render(<ProductListHeader />);

    expect(screen.queryByRole('button', { name: 'Hide trigger run pills' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show trigger run pills' })).toBeNull();
  });

  it('keeps the create button inline with the Products heading', () => {
    const { container } = render(<ProductListHeader />);

    const titleRow = findDivByExactClassName(container, 'flex items-center gap-2');

    expect(within(titleRow).getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(
      within(titleRow).getByRole('button', { name: 'Create new product' })
    ).toBeInTheDocument();
    expect(within(titleRow).queryByText('Pagination')).toBeNull();
  });

  it('renders desktop filters on a dedicated row below the pagination and selectors', () => {
    const { container } = render(
      <ProductListHeader
        filtersContent={<div data-testid='filters-content'>Filters content</div>}
      />
    );

    const desktopSection = findDivByExactClassName(container, 'hidden space-y-3 lg:block');
    const desktopHeaderRow = findDivByExactClassName(
      desktopSection,
      'flex items-start justify-between gap-3'
    );
    const desktopControlsRow = findDivByExactClassName(
      desktopSection,
      'relative z-0 flex w-full min-w-0 flex-wrap items-center justify-end gap-2 pt-1'
    );

    expect(desktopControlsRow.parentElement).toBe(desktopHeaderRow);
    expect(within(desktopControlsRow).getByText('Pagination')).toBeInTheDocument();
    expect(
      within(desktopControlsRow).getByLabelText('Select product name language')
    ).toBeInTheDocument();
    expect(within(desktopControlsRow).getByLabelText('Select currency')).toBeInTheDocument();
    expect(within(desktopControlsRow).getByLabelText('Filter by catalog')).toBeInTheDocument();
    expect(within(desktopControlsRow).getByTestId('trigger-button-bar')).toHaveAttribute(
      'data-location',
      'product_list'
    );
    expect(within(desktopControlsRow).queryByTestId('filters-content')).toBeNull();

    const desktopFiltersRow = desktopSection.lastElementChild;
    expect(desktopFiltersRow).not.toBeNull();
    expect(desktopFiltersRow).toHaveClass('w-full');
    expect(within(desktopFiltersRow as HTMLElement).getByTestId('filters-content')).toHaveTextContent(
      'Filters content'
    );
  });
});
