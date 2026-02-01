"use client";

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  getProducts, 
  countProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from "@/features/products/api";
import type { 
  ProductWithImages, 
} from "@/features/products/types";
import type { DeleteResponse } from "@/shared/types/api";

// --- Queries ---

export interface UseProductsFilters {
  search?: string | undefined;
  sku?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
}

export function useProducts(
  filters: UseProductsFilters,
  options: { enabled?: boolean } = {}
): UseQueryResult<ProductWithImages[], Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
    enabled,
  });
}

export function useProductsCount(
  filters: UseProductsFilters,
  options: { enabled?: boolean } = {}
): UseQueryResult<number, Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products-count", filters],
    queryFn: () => countProducts(filters),
    enabled,
  });
}

// --- Mutations ---

export function useCreateProductMutation(): UseMutationResult<unknown, Error, FormData, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => createProduct(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-count"] });
    },
  });
}

export function useUpdateProductMutation(): UseMutationResult<ProductWithImages, Error, { id: string; data: Partial<ProductWithImages> | FormData }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      if (data instanceof FormData) {
        const response = await fetch(`/api/products/${id}`, {
          method: "PUT",
          body: data,
        });
        if (!response.ok) throw new Error("Failed to update product");
        return response.json();
      } else {
        return updateProduct(id, data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", data.id] });
    },
  });
}

export function useDeleteProductMutation(): UseMutationResult<DeleteResponse, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id) as Promise<DeleteResponse>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-count"] });
    },
  });
}

export function useBulkDeleteProductsMutation(): UseMutationResult<{ success: boolean }, Error, string[], unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const responses = await Promise.all(
        ids.map(id => deleteProduct(id))
      );
      if (responses.some(r => !r.success)) throw new Error("Failed to delete some products");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-count"] });
    },
  });
}

// --- Composite Hook ---

export interface UseProductDataProps {
  refreshTrigger?: number;
  initialCatalogFilter?: string | null;
  initialPageSize?: number | null;
  preferencesLoaded: boolean;
  currencyCode?: string | null;
  priceGroups?: any[];
  searchLanguage?: string | null;
}

export interface ProductDataHookResult {
  data: ProductWithImages[];
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (s: string) => void;
  sku: string;
  setSku: (s: string) => void;
  minPrice: number | undefined;
  setMinPrice: (p: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (p: number | undefined) => void;
  startDate: string | undefined;
  setStartDate: (s: string | undefined) => void;
  endDate: string | undefined;
  setEndDate: (s: string | undefined) => void;
  catalogFilter: string;
  setCatalogFilter: (f: string) => void;
  loadError: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refresh: () => void;
}

export function useProductData({
  refreshTrigger,
  initialCatalogFilter,
  initialPageSize,
  preferencesLoaded,
  searchLanguage,
}: UseProductDataProps): ProductDataHookResult {
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize || 20);
  const [search, setSearch] = useState("");
  const [sku, setSku] = useState("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [catalogFilter, setCatalogFilter] = useState(initialCatalogFilter || "all");

  useEffect(() => {
    if (preferencesLoaded && initialCatalogFilter) {
      setCatalogFilter(initialCatalogFilter);
    }
  }, [preferencesLoaded, initialCatalogFilter]);

  useEffect(() => {
    if (preferencesLoaded && initialPageSize) {
      setPageSize(initialPageSize);
    }
  }, [preferencesLoaded, initialPageSize]);

  const filters: UseProductsFilters = useMemo(() => ({
    search: search || undefined,
    sku: sku || undefined,
    minPrice,
    maxPrice,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
    catalogId: catalogFilter === "all" ? undefined : catalogFilter,
    searchLanguage: searchLanguage || undefined,
  }), [search, sku, minPrice, maxPrice, startDate, endDate, page, pageSize, catalogFilter, searchLanguage]);

  const productsQuery = useProducts(filters, { enabled: preferencesLoaded });
  const countQuery = useProductsCount(filters, { enabled: preferencesLoaded });

  const totalPages = useMemo(() => {
    const total = countQuery.data || 0;
    return Math.ceil(total / pageSize);
  }, [countQuery.data, pageSize]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["products-count"] });
  }, [queryClient]);

  // Invalidate when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  return {
    data: productsQuery.data || [],
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
    loadError: (productsQuery.error || countQuery.error),
    isLoading: productsQuery.isLoading || countQuery.isLoading,
    isFetching: productsQuery.isFetching || countQuery.isFetching,
    refresh,
  };
}
