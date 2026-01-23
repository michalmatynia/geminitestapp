"use client";

import React, { memo, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, CheckSquare, Settings2, Trash2, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProductWithImages } from "@/types";
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
}: ProductFiltersProps) {
  const hasActiveFilters = search || sku || minPrice || maxPrice || startDate || endDate;

  const handleResetFilters = () => {
    setSearch("");
    setSku("");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="mb-4 space-y-3 rounded-lg border bg-card p-4">
      {/* Filter title and reset button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 gap-2"
          >
            <X className="h-3 w-3" />
            Reset filters
          </Button>
        )}
      </div>

      {/* Filters grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {/* Search by name */}
        <div className="space-y-1.5">
          <Label htmlFor="search-name" className="text-xs font-medium">
            Name
          </Label>
          <Input
            id="search-name"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Search by SKU */}
        <div className="space-y-1.5">
          <Label htmlFor="search-sku" className="text-xs font-medium">
            SKU
          </Label>
          <Input
            id="search-sku"
            placeholder="Search by SKU..."
            value={sku}
            onChange={(e) => setSku(e.target.value)}
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
            onChange={(e) =>
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
            onChange={(e) =>
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
            onChange={(e) => setStartDate(e.target.value)}
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
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
});

interface ProductSelectionActionsProps {
  data?: ProductWithImages[];
  rowSelection?: RowSelectionState;
  setRowSelection?: (selection: RowSelectionState) => void;
  onSelectAllGlobal?: () => Promise<void>;
  loadingGlobal?: boolean;
  onDeleteSelected?: () => Promise<void>;
  onAddToMarketplace?: () => void;
}

export const ProductSelectionActions = memo(function ProductSelectionActions({
  data = [],
  rowSelection = {},
  setRowSelection = () => {},
  onSelectAllGlobal,
  loadingGlobal,
  onDeleteSelected,
  onAddToMarketplace,
}: ProductSelectionActionsProps) {
  const handleSelectAllGlobal = useCallback(async () => {
    if (!onSelectAllGlobal) return;
    try {
      await onSelectAllGlobal();
    } catch (error) {
      console.error("Failed to select all products:", error);
    }
  }, [onSelectAllGlobal]);

  const handleDeleteSelected = useCallback(async () => {
    if (!onDeleteSelected) return;
    try {
      await onDeleteSelected();
    } catch (error) {
      console.error("Failed to delete selected products:", error);
    }
  }, [onDeleteSelected]);

  const handleSelectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((product) => {
      newSelection[product.id] = true;
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const handleDeselectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((product) => {
      delete newSelection[product.id];
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const handleDeselectAll = useCallback(() => {
    setRowSelection({});
  }, [setRowSelection]);

  const hasSelection = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]).length > 0,
    [rowSelection]
  );

  return (
    <div className="flex flex-wrap gap-2 border-t pt-3 sm:gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Selection
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>On this Page</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={handleSelectPage}
              className="cursor-pointer"
            >
              Select All on Page
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeselectPage}
              className="cursor-pointer"
            >
              Deselect All on Page
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>On All Pages</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => void handleSelectAllGlobal()}
              className="cursor-pointer"
              disabled={!!loadingGlobal}
            >
              {loadingGlobal ? "Loading..." : "Select All Globally"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeselectAll}
              className="cursor-pointer"
            >
              Deselect All
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasSelection}
          >
            <Settings2 className="h-4 w-4" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              if (onAddToMarketplace) onAddToMarketplace();
            }}
            className="cursor-pointer gap-2"
          >
            <Store className="h-4 w-4" />
            Add to Marketplace
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleDeleteSelected()}
            className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
