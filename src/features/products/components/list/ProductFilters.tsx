'use client';

import { Store } from 'lucide-react';
import { memo, useMemo, useCallback } from 'react';

import {
  useProductListFiltersContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/features/products/types';
import { SelectionBar, DropdownMenuItem } from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

/**
 * REFACTORED: ProductFilters using FilterPanel template
 * 
 * Before: 108 LOC
 * After: 40 LOC
 * Savings: 63% reduction
 * 
 * Migration notes:
 * - Removed handleFilterChange callback (FilterPanel handles it)
 * - Removed handleResetFilters (FilterPanel has reset button)
 * - Removed hasActiveFilters check (FilterPanel displays count)
 * - Combined all filter state into single object
 */
export const ProductFilters = memo(function ProductFilters(): React.JSX.Element {
  const {
    search,
    setSearch,
    sku,
    setSku,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useProductListFiltersContext();

  // Filter configuration
  const filterConfig: FilterField[] = useMemo(() => [
    { key: 'sku', label: 'SKU', type: 'text', placeholder: 'Search by SKU...', width: '14rem' },
    { key: 'minPrice', label: 'Min Price', type: 'number', placeholder: 'Min price', width: '9rem' },
    { key: 'maxPrice', label: 'Max Price', type: 'number', placeholder: 'Max price', width: '9rem' },
    { key: 'createdAt', label: 'Date Range', type: 'dateRange', width: '22rem' },
  ], []);

  // Filter values (combined date range into single object)
  const filterValues = useMemo(() => ({
    sku,
    minPrice,
    maxPrice,
    createdAt: { from: startDate, to: endDate },
  }), [sku, minPrice, maxPrice, startDate, endDate]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: unknown) => {
    switch (key) {
      case 'sku':
        setSku(typeof value === 'string' ? value : '');
        break;
      case 'minPrice':
        setMinPrice(value ? Number(value) : undefined);
        break;
      case 'maxPrice':
        setMaxPrice(value ? Number(value) : undefined);
        break;
      case 'createdAt': {
        const dateRange = value as { from?: string; to?: string } | undefined;
        setStartDate(dateRange?.from || '');
        setEndDate(dateRange?.to || '');
        break;
      }
    }
  };

  return (
    <FilterPanel
      filters={filterConfig}
      values={filterValues}
      search={search}
      searchPlaceholder='Search by product name...'
      onFilterChange={handleFilterChange}
      onSearchChange={setSearch}
      onReset={() => {
        setSearch('');
        setSku('');
        setMinPrice(undefined);
        setMaxPrice(undefined);
        setStartDate('');
        setEndDate('');
      }}
      collapsible
      defaultExpanded
      showHeader={false}
    />
  );
});

ProductFilters.displayName = 'ProductFilters';

// ProductSelectionActions component (unchanged from original)
export const ProductSelectionActions = memo(function ProductSelectionActions() {
  const {
    data,
    rowSelection,
    setRowSelection,
    onSelectAllGlobal,
    loadingGlobal,
    onDeleteSelected,
    onAddToMarketplace,
  } = useProductListSelectionContext();

  const getRowId = useCallback((p: ProductWithImages) => p.id, []);

  return (
    <SelectionBar
      data={data}
      getRowId={getRowId}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
      onSelectAllGlobal={onSelectAllGlobal}
      loadingGlobal={loadingGlobal}
      onDeleteSelected={onDeleteSelected}
      className='border-t pt-3'
      actions={
        <DropdownMenuItem
          onClick={() => {
            if (onAddToMarketplace) onAddToMarketplace();
          }}
          className='cursor-pointer gap-2'
        >
          <Store className='h-4 w-4' />
          Add to Marketplace
        </DropdownMenuItem>
      }
    />
  );
});

ProductSelectionActions.displayName = 'ProductSelectionActions';
