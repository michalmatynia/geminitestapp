"use client";

import { useState, useEffect, useMemo } from "react";
import { getProducts, countProducts } from "@/lib/api";
import { ProductWithImages } from "@/types";
import { logger } from "@/lib/logger";

interface UseProductDataProps {
  refreshTrigger: number;
  initialCatalogFilter?: string;
  initialPageSize?: number;
  preferencesLoaded?: boolean;
}

export function useProductData({
  refreshTrigger,
  initialCatalogFilter = "all",
  initialPageSize = 24,
  preferencesLoaded = true,
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

  // Sync catalogFilter when initialCatalogFilter changes (from preferences)
  useEffect(() => {
    if (preferencesLoaded && catalogFilter !== initialCatalogFilter) {
      setCatalogFilter(initialCatalogFilter);
    }
  }, [initialCatalogFilter, preferencesLoaded, catalogFilter]);

  // Sync pageSize when initialPageSize changes (from preferences)
  useEffect(() => {
    if (preferencesLoaded && pageSize !== initialPageSize) {
      setPageSize(initialPageSize);
    }
  }, [initialPageSize, preferencesLoaded, pageSize]);

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

  // Load products - wait for preferences to load first
  useEffect(() => {
    // Don't fetch until preferences are loaded to avoid fetching with default values
    if (!preferencesLoaded) {
      return;
    }

    const filters = {
      search: debouncedSearch,
      sku: debouncedSku,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      page,
      pageSize,
      catalogId: catalogFilter === "all" ? undefined : catalogFilter,
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
  }, [debouncedSearch, debouncedSku, minPrice, maxPrice, startDate, endDate, page, pageSize, catalogFilter, refreshTrigger, preferencesLoaded]);

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
