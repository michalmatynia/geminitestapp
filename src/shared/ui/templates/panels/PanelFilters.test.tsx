// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' className={className} {...props}>
      {children}
    </button>
  ),
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement> & { children?: React.ReactNode }) => (
    <label {...props}>{children}</label>
  ),
  SearchInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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
}));

vi.mock('@/shared/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: () => <div data-testid='multi-select' />,
}));

import { PanelFilters } from './PanelFilters';

const filters = [
  {
    key: 'sku',
    label: 'SKU',
    type: 'text' as const,
    placeholder: 'Search by SKU...',
    width: '14rem',
  },
];

describe('PanelFilters layout contract', () => {
  it('keeps the toggle button width and alignment stable across collapsed states', async () => {
    const onFilterChange = vi.fn();
    const onSearchChange = vi.fn();
    const view = render(
      <PanelFilters
        filters={filters}
        values={{ sku: 'sku-1' }}
        search=''
        searchPlaceholder='Search by product name...'
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        collapsible
        defaultExpanded={false}
        toggleButtonAlignment='start'
      />
    );

    const showFiltersButton = screen.getByRole('button', { name: /Show Filters/ });
    expect(showFiltersButton.className).toContain(
      'h-8 w-full justify-center gap-1.5 px-3 tabular-nums sm:w-[10rem] sm:shrink-0'
    );
    expect(showFiltersButton.className).not.toContain('sm:ml-auto');

    const collapsedCountSlot = showFiltersButton.querySelector('span');
    expect(collapsedCountSlot?.className).toContain('inline-flex min-w-[3ch] justify-center');

    view.rerender(
      <PanelFilters
        filters={filters}
        values={{ sku: 'sku-1' }}
        search=''
        searchPlaceholder='Search by product name...'
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        collapsible
        defaultExpanded
        toggleButtonAlignment='start'
      />
    );

    const hideFiltersButton = await screen.findByRole('button', { name: /Hide Filters/ });
    expect(hideFiltersButton.className).toContain(
      'h-8 w-full justify-center gap-1.5 px-3 tabular-nums sm:w-[10rem] sm:shrink-0'
    );
    expect(hideFiltersButton.className).not.toContain('sm:ml-auto');

    const expandedCountSlot = hideFiltersButton.querySelector('span');
    expect(expandedCountSlot?.className).toContain('inline-flex min-w-[3ch] justify-center');
  });

  it('uses deterministic input ids when an id base is provided', () => {
    render(
      <PanelFilters
        idBase='products-mobile'
        filters={filters}
        values={{ sku: 'sku-1' }}
        search=''
        searchPlaceholder='Search by product name...'
        onFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        collapsible
        defaultExpanded
      />
    );

    expect(screen.getByLabelText('Search by product name...')).toHaveAttribute(
      'id',
      'panel-filters-search-products-mobile'
    );
    expect(screen.getByLabelText('SKU')).toHaveAttribute(
      'id',
      'panel-filter-sku-products-mobile'
    );
  });
});
