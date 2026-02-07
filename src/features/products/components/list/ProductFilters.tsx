'use client';

import { Store } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import { useProductListContext } from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/features/products/types';
import { DynamicFilters, SelectionBar, DropdownMenuItem, type FilterField } from '@/shared/ui';

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
  } = useProductListContext();

  const hasActiveFilters = Boolean(search || sku || minPrice || maxPrice || startDate || endDate);

  const filterFields: FilterField[] = useMemo(() => [
    { key: 'search', label: 'Name', type: 'search', placeholder: 'Search by name...' },
    { key: 'sku', label: 'SKU', type: 'search', placeholder: 'Search by SKU...' },
    { key: 'minPrice', label: 'Min Price', type: 'number', placeholder: 'Min price' },
    { key: 'maxPrice', label: 'Max Price', type: 'number', placeholder: 'Max price' },
    { key: 'startDate', label: 'From Date', type: 'date' },
    { key: 'endDate', label: 'To Date', type: 'date' },
  ], []);

  const handleFilterChange = useCallback((key: string, value: string): void => {
    if (key === 'search') setSearch(value);
    if (key === 'sku') setSku(value);
    if (key === 'minPrice') setMinPrice(value ? parseInt(value, 10) : undefined);
    if (key === 'maxPrice') setMaxPrice(value ? parseInt(value, 10) : undefined);
    if (key === 'startDate') setStartDate(value);
    if (key === 'endDate') setEndDate(value);
  }, [setSearch, setSku, setMinPrice, setMaxPrice, setStartDate, setEndDate]);

  const handleResetFilters = (): void => {
    setSearch('');
    setSku('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartDate('');
    setEndDate('');
  };

  return (
    <DynamicFilters
      fields={filterFields}
      values={{ search, sku, minPrice, maxPrice, startDate, endDate }}
      onChange={handleFilterChange}
      onReset={handleResetFilters}
      hasActiveFilters={hasActiveFilters}
      gridClassName="sm:grid-cols-2 lg:grid-cols-6"
    />
  );
});

export const ProductSelectionActions = memo(function ProductSelectionActions() {
  const {
    data,
    rowSelection,
    setRowSelection,
    onSelectAllGlobal,
    loadingGlobal,
    onDeleteSelected,
    onAddToMarketplace,
  } = useProductListContext();

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
      className="border-t pt-3"
      actions={
        <DropdownMenuItem
          onClick={() => {
            if (onAddToMarketplace) onAddToMarketplace();
          }}
          className="cursor-pointer gap-2"
        >
          <Store className="h-4 w-4" />
          Add to Marketplace
        </DropdownMenuItem>
      }
    />
  );
});
