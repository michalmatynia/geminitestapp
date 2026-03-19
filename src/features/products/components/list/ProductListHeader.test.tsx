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
  AdminProductsBreadcrumbs: ({
    className,
  }: {
    className?: string;
  }) => (
    <nav data-testid='product-list-breadcrumbs' className={className}>
      Breadcrumbs
    </nav>
  ),
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

  it('keeps the breadcrumb under a plain heading and moves create actions into the header rail', () => {
    const { container } = render(<ProductListHeader />);

    const desktopSection = findDivByExactClassName(container, 'hidden space-y-3 lg:block');
    const desktopHeaderRow = findDivByExactClassName(
      desktopSection,
      'flex flex-wrap items-start justify-between gap-3'
    );
    const desktopTitleStack = findDivByExactClassName(
      desktopHeaderRow,
      'space-y-1 shrink-0 min-w-max'
    );
    const desktopControlsRow = findDivByExactClassName(
      desktopHeaderRow,
      'flex flex-wrap items-center gap-2 pt-1 relative z-0 min-w-0 flex-1 justify-end'
    );
    const breadcrumb = within(desktopTitleStack).getByTestId('product-list-breadcrumbs');

    expect(within(desktopTitleStack).getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb).not.toHaveClass('mt-1');
    expect(within(desktopTitleStack).queryByRole('button', { name: 'Create new product' })).toBeNull();
    expect(
      within(desktopControlsRow).getByRole('button', { name: 'Create new product' })
    ).toBeInTheDocument();
    expect(within(desktopControlsRow).getByText('Pagination')).toBeInTheDocument();
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
      'flex flex-wrap items-start justify-between gap-3'
    );
    const desktopTitleStack = findDivByExactClassName(
      desktopHeaderRow,
      'space-y-1 shrink-0 min-w-max'
    );
    const desktopControlsRow = findDivByExactClassName(
      desktopHeaderRow,
      'flex flex-wrap items-center gap-2 pt-1 relative z-0 min-w-0 flex-1 justify-end'
    );

    expect(within(desktopTitleStack).getByTestId('product-list-breadcrumbs')).not.toHaveClass(
      'mt-1'
    );
    expect(within(desktopControlsRow).getByRole('button', { name: 'Create new product' })).toBeInTheDocument();
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
