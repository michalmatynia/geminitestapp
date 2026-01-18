"use client";

import { useState, useEffect, useMemo } from "react";
import { getProducts, countProducts } from "@/lib/api";
import { ProductWithImages } from "@/types";
import { logger } from "@/lib/logger";

interface UseProductDataProps {
  refreshTrigger: number;
}

export function useProductData({ refreshTrigger }: UseProductDataProps) {
  const [data, setData] = useState<ProductWithImages[]>([]);
  const [total, setTotal] = useState(0);
  
  // Filter state
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [debouncedSku, setDebouncedSku] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [catalogFilter, setCatalogFilter] = useState("all");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Load products
  useEffect(() => {
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
    console.log("[useProductData] Loading products with filters:", filters);
    let cancelled = false;
    const loadProducts = async () => {
      setLoadError(null);
      try {
        const [products, productCount] = await Promise.all([
          getProducts(filters),
          countProducts(filters)
        ]);
        if (!cancelled) {
          setData(products);
          setTotal(productCount);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load products";
        logger.error("Failed to load products:", error);
        if (!cancelled) {
          setLoadError(message);
        }
      }
    };
    
    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, debouncedSku, minPrice, maxPrice, startDate, endDate, page, pageSize, refreshTrigger]);

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
  };
}
