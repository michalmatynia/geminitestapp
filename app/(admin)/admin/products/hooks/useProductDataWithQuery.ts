"use client";

import { useState, useMemo, useCallback } from "react";
import { useProductsWithCount } from "@/lib/hooks/useProductsQuery";

interface UseProductDataWithQueryProps {
  initialCatalogFilter?: string;
  initialPageSize?: number;
  preferencesLoaded?: boolean;
}

export function useProductDataWithQuery({
  initialCatalogFilter = "all",
  initialPageSize = 24,
  preferencesLoaded = true,
}: UseProductDataWithQueryProps = {}) {
  // Filter state
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [debouncedSku, setDebouncedSku] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [catalogFilter, setCatalogFilter] = useState(initialCatalogFilter);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  });

  // Debounce SKU
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSku(sku);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  });

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      sku: debouncedSku,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      page,
      pageSize,
      catalogId: catalogFilter === "all" ? undefined : catalogFilter,
    }),
    [debouncedSearch, debouncedSku, minPrice, maxPrice, startDate, endDate, page, pageSize, catalogFilter]
  );

  const { products, total, isLoading, isFetching, error, refetch } = useProductsWithCount(filters, {
    enabled: preferencesLoaded,
  });

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSku("");
    setDebouncedSku("");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  return {
    data: products,
    total,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
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
    catalogFilter,
    setCatalogFilter,
    isLoading,
    isFetching,
    error: error ? (error instanceof Error ? error.message : "Failed to load products") : null,
    refetch,
    resetFilters,
  };
}
