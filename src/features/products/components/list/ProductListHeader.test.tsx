// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('ProductListHeader', () => {
  beforeEach(() => {
    useAdminLayoutStateMock.mockReturnValue({ isMenuHidden: false });
    useAdminLayoutActionsMock.mockReturnValue({ setIsMenuHidden: vi.fn() });
    useProductListHeaderActionsContextMock.mockReturnValue({
      onCreateProduct: vi.fn(),
      onCreateFromDraft: vi.fn(),
      activeDrafts: [],
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback: vi.fn(),
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

  it('toggles the global trigger run feedback preference from the header button', () => {
    const setShowTriggerRunFeedback = vi.fn();
    useProductListHeaderActionsContextMock.mockReturnValue({
      onCreateProduct: vi.fn(),
      onCreateFromDraft: vi.fn(),
      activeDrafts: [],
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback,
    });

    render(<ProductListHeader />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Hide trigger run pills' })[0]);

    expect(setShowTriggerRunFeedback).toHaveBeenCalledWith(false);
  });
});
