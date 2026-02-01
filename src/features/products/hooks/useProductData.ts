/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { PriceGroupWithDetails } from "@/features/products/types";
import { useProductsWithCount } from "@/features/products/hooks/useProductsQuery";

interface UseProductDataProps {
  refreshTrigger: number;
  initialCatalogFilter?: string;
  initialPageSize?: number;
  preferencesLoaded?: boolean;
  currencyCode?: string;
  priceGroups?: PriceGroupWithDetails[];
  searchLanguage?: string; // "name_en" | "name_pl" | "name_de" - limits search to specific language
}

/**
 * Converts a price filter value from the display currency to the base currency.
 * This allows filtering to work correctly when viewing prices in a dependent currency.
 */
function convertPriceFilterToBase(
  filterValue: number | undefined,
  currencyCode: string | undefined,
  priceGroups: PriceGroupWithDetails[] | undefined,
): number | undefined {
  if (filterValue === undefined || !currencyCode || !priceGroups?.length) {
    return filterValue;
  }

  // Find the price group for the selected currency
  const targetGroup = priceGroups.find(
    (g) => g.currency?.code === currencyCode || g.currencyCode === currencyCode,
  );

  if (!targetGroup) {
    return filterValue;
  }

  // If it's a dependent price group, convert back to base currency
  if (targetGroup.type === "dependent" && targetGroup.sourceGroupId) {
    const multiplier = targetGroup.priceMultiplier || 1;
    const addToPrice = targetGroup.addToPrice || 0;

    // Reverse the formula: displayPrice = basePrice * multiplier + addToPrice
    // So: basePrice = (displayPrice - addToPrice) / multiplier
    return Math.round((filterValue - addToPrice) / multiplier);
  }

  // If it's a standard/base currency, no conversion needed
  return filterValue;
}

export function useProductData({
  refreshTrigger,
  initialCatalogFilter = "all",
  initialPageSize = 24,
  preferencesLoaded = true,
  currencyCode,
  priceGroups,
  searchLanguage,
}: UseProductDataProps) {
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

  // Track whether initial sync from preferences has completed
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);

  // Sync catalogFilter and pageSize when preferences load
  // We do this during render to avoid useEffect state sync warnings
  if (preferencesLoaded && !initialSyncComplete) {
    setInitialSyncComplete(true);
    if (catalogFilter !== initialCatalogFilter) {
      setCatalogFilter(initialCatalogFilter);
    }
    if (pageSize !== initialPageSize) {
      setPageSize(initialPageSize);
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce SKU
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSku(sku);
    }, 300);
    return () => clearTimeout(timer);
  }, [sku]);

  // Reset page when filters change
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(t);
  }, [
    debouncedSearch,
    debouncedSku,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    catalogFilter,
  ]);

  const convertedMinPrice = useMemo(
    () => convertPriceFilterToBase(minPrice, currencyCode, priceGroups),
    [minPrice, currencyCode, priceGroups],
  );

  const convertedMaxPrice = useMemo(
    () => convertPriceFilterToBase(maxPrice, currencyCode, priceGroups),
    [maxPrice, currencyCode, priceGroups],
  );

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      sku: debouncedSku,
      minPrice: convertedMinPrice,
      maxPrice: convertedMaxPrice,
      startDate,
      endDate,
      page,
      pageSize,
      catalogId: catalogFilter === "all" ? undefined : catalogFilter,
      searchLanguage,
    }),
    [
      debouncedSearch,
      debouncedSku,
      convertedMinPrice,
      convertedMaxPrice,
      startDate,
      endDate,
      page,
      pageSize,
      catalogFilter,
      searchLanguage,
    ],
  );

  const {
    products: data,
    total,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProductsWithCount(filters, {
    enabled: preferencesLoaded && initialSyncComplete,
  });

  const lastRefreshTrigger = useRef(refreshTrigger);
  useEffect(() => {
    if (refreshTrigger > lastRefreshTrigger.current) {
      lastRefreshTrigger.current = refreshTrigger;
      void refetch();
    }
  }, [refreshTrigger, refetch]);

  const loadError = useMemo(() => {
    if (!error) return null;
    return error instanceof Error ? error.message : "Failed to load products";
  }, [error]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  return {
    data,
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
    loadError,
    isLoading,
    isFetching,
  };
}
