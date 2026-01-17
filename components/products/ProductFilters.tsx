"use client";

import React, { memo } from "react";
import { Input } from "@/components/ui/input";

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
  return (
    <div className="mb-4 flex space-x-4">
      <Input
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Input
        placeholder="Search by SKU..."
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        className="max-w-sm"
      />
      <Input
        type="number"
        placeholder="Min Price"
        value={minPrice || ""}
        onChange={(e) =>
          setMinPrice(
            e.target.value ? parseInt(e.target.value, 10) : undefined
          )
        }
        className="max-w-xs"
      />
      <Input
        type="number"
        placeholder="Max Price"
        value={maxPrice || ""}
        onChange={(e) =>
          setMaxPrice(
            e.target.value ? parseInt(e.target.value, 10) : undefined
          )
        }
        className="max-w-xs"
      />
      <Input
        type="date"
        placeholder="Start Date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="max-w-xs"
      />
      <Input
        type="date"
        placeholder="End Date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="max-w-xs"
      />
    </div>
  );
});