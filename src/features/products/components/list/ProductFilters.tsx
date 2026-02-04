"use client";

import { Input, Label, Button, DropdownMenuItem, SearchInput, SelectionBar, FiltersContainer } from "@/shared/ui";
import { memo, useCallback } from "react";



import { Store } from "lucide-react";

import type { ProductWithImages } from "@/features/products/types";
import type { RowSelectionState } from "@tanstack/react-table";

interface ProductFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  sku: string;
  setSku: (value: string) => void;
  minPrice: number | undefined;
  setMinPrice: (value: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (value: number | undefined) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
}

export const ProductFilters = memo(function ProductFilters({
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
}: ProductFiltersProps): React.JSX.Element {
  const hasActiveFilters = Boolean(search || sku || minPrice || maxPrice || startDate || endDate);

  const handleResetFilters = (): void => {
    setSearch("");
    setSku("");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartDate("");
    setEndDate("");
  };

  return (
    <FiltersContainer
      hasActiveFilters={hasActiveFilters}
      onReset={handleResetFilters}
      gridClassName="sm:grid-cols-2 lg:grid-cols-7"
    >
      {/* Search by name */}
      <div className="space-y-1.5">
        <Label htmlFor="search-name" className="text-xs font-medium">
          Name
        </Label>
        <SearchInput
          id="search-name"
          placeholder="Search by name..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          className="h-8 text-sm"
        />
      </div>

      {/* Search by SKU */}
      <div className="space-y-1.5">
        <Label htmlFor="search-sku" className="text-xs font-medium">
          SKU
        </Label>
        <SearchInput
          id="search-sku"
          placeholder="Search by SKU..."
          value={sku}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSku(e.target.value)}
          onClear={() => setSku("")}
          className="h-8 text-sm"
        />
      </div>

      {/* Min Price */}
      <div className="space-y-1.5">
        <Label htmlFor="min-price" className="text-xs font-medium">
          Min Price
        </Label>
        <Input
          id="min-price"
          type="number"
          placeholder="Min price"
          value={minPrice || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMinPrice(
              e.target.value ? parseInt(e.target.value, 10) : undefined
            )
          }
          className="h-8 text-sm"
        />
      </div>

      {/* Max Price */}
      <div className="space-y-1.5">
        <Label htmlFor="max-price" className="text-xs font-medium">
          Max Price
        </Label>
        <Input
          id="max-price"
          type="number"
          placeholder="Max price"
          value={maxPrice || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMaxPrice(
              e.target.value ? parseInt(e.target.value, 10) : undefined
            )
          }
          className="h-8 text-sm"
        />
      </div>

      {/* Start Date */}
      <div className="space-y-1.5">
        <Label htmlFor="start-date" className="text-xs font-medium">
          From Date
        </Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* End Date */}
      <div className="space-y-1.5">
        <Label htmlFor="end-date" className="text-xs font-medium">
          To Date
        </Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    </FiltersContainer>
  );
});

interface ProductSelectionActionsProps {
  data?: ProductWithImages[];
  rowSelection?: RowSelectionState;
  setRowSelection?: (selection: RowSelectionState) => void;
  onSelectAllGlobal?: (() => Promise<void>) | undefined;
  loadingGlobal?: boolean | undefined;
  onDeleteSelected?: (() => Promise<void>) | undefined;
  onAddToMarketplace?: (() => void) | undefined;
}

export const ProductSelectionActions = memo(function ProductSelectionActions({
  data = [],
  rowSelection = {},
  setRowSelection = (): void => {},
  onSelectAllGlobal,
  loadingGlobal,
  onDeleteSelected,
  onAddToMarketplace,
}: ProductSelectionActionsProps) {
  const getRowId = useCallback((p: ProductWithImages) => p.id, []);

  return (
    <SelectionBar
      data={data}
      getRowId={getRowId}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
      {...(onSelectAllGlobal ? { onSelectAllGlobal } : {})}
      {...(loadingGlobal !== undefined ? { loadingGlobal } : {})}
      {...(onDeleteSelected ? { onDeleteSelected } : {})}
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
