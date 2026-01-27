"use client";

import { useState, useEffect, useMemo } from "react";
import { getProducts, countProducts } from "@/features/products/api";
import { ProductWithImages, PriceGroupWithDetails } from "@/features/products/types";
import { logger } from "@/shared/utils/logger";

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
  priceGroups: PriceGroupWithDetails[] | undefined
): number | undefined {
  if (filterValue === undefined || !currencyCode || !priceGroups?.length) {
    return filterValue;
  }

  // Find the price group for the selected currency
  const targetGroup = priceGroups.find(
    (g) => g.currency?.code === currencyCode || g.currencyCode === currencyCode
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
  const [data, setData] = useState<ProductWithImages[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

  const [loadError, setLoadError] = useState<string | null>(null);

  // Track whether initial sync from preferences has completed
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);

  // Sync catalogFilter and pageSize when preferences load (single effect to avoid multiple state updates)
  useEffect(() => {
    if (preferencesLoaded && !initialSyncComplete) {
      // Batch state updates to prevent multiple re-renders
      const needsCatalogSync = catalogFilter !== initialCatalogFilter;
      const needsPageSizeSync = pageSize !== initialPageSize;

      if (needsCatalogSync) {
        setCatalogFilter(initialCatalogFilter);
      }
      if (needsPageSizeSync) {
        setPageSize(initialPageSize);
      }

      // Mark sync as complete - this will allow the fetch to proceed
      setInitialSyncComplete(true);
    }
  }, [initialCatalogFilter, initialPageSize, preferencesLoaded, initialSyncComplete, catalogFilter, pageSize]);

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
  }, [debouncedSearch, debouncedSku, minPrice, maxPrice, startDate, endDate, catalogFilter]);

  // Load products - wait for preferences to load AND initial sync to complete
  useEffect(() => {
    // Don't fetch until preferences are loaded AND synced to local state
    // This prevents a double fetch when preferences differ from initial values
    if (!preferencesLoaded || !initialSyncComplete) {
      return;
    }

    // Convert price filters from display currency to base currency for correct DB queries
    const convertedMinPrice = convertPriceFilterToBase(minPrice, currencyCode, priceGroups);
    const convertedMaxPrice = convertPriceFilterToBase(maxPrice, currencyCode, priceGroups);

    const filters = {
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
    };
    let cancelled = false;
    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [products, productCount] = await Promise.all([
          getProducts(filters),
          countProducts(filters),
        ]);
        if (!cancelled) {
          setData(products);
          setTotal(productCount);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load products";
        logger.error("Failed to load products:", error);
        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, debouncedSku, minPrice, maxPrice, startDate, endDate, page, pageSize, catalogFilter, refreshTrigger, preferencesLoaded, initialSyncComplete, currencyCode, priceGroups, searchLanguage]);

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
  };
}
