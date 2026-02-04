"use client";

import { useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { useOfflineMutation } from "@/shared/hooks/offline/useOfflineMutation";
import { addQueuedProductId, removeQueuedProductId } from "@/features/products/state/queued-product-ops";

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

const PRODUCTS_STALE_MS = 10_000;

export function useProducts(
  filters: UseProductsFilters,
  options: { enabled?: boolean } = {}
): UseQueryResult<ProductWithImages[], Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
    enabled,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    networkMode: "always",
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
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    networkMode: "always",
  });
}

// --- Mutations ---

export function useCreateProductMutation(): UseMutationResult<unknown, Error, FormData, unknown> {
  return useOfflineMutation(
    (formData: FormData) => createProduct(formData),
    {
      queryKey: ["products"],
      extraInvalidateKeys: [["products-count"]],
      queuedMessage: "Product creation queued in runtime queue.",
      processedMessage: "Queued product creation completed.",
      errorMessage: "Failed to create product",
    }
  );
}

export function useUpdateProductMutation(): UseMutationResult<ProductWithImages | null, Error, { id: string; data: Partial<ProductWithImages> | FormData }, unknown> {
  return useOfflineMutation(
    async ({ id, data }: { id: string; data: Partial<ProductWithImages> | FormData }): Promise<ProductWithImages> => {
      if (data instanceof FormData) {
        const response = await fetch(`/api/products/${id}`, {
          method: "PUT",
          body: data,
        });
        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
            details?: unknown;
          };
          let message = errorData.error || "Failed to update product";
          if (Array.isArray(errorData.details) && errorData.details.length > 0) {
            const detailMessages = errorData.details
              .slice(0, 3)
              .map((d: { field?: unknown; message?: unknown }) => {
                const field = typeof d.field === "string" && d.field ? d.field : "field";
                const msg = typeof d.message === "string" && d.message ? d.message : "invalid";
                return `${field}: ${msg}`;
              })
              .join(", ");
            if (detailMessages) message = `${message} (${detailMessages})`;
          }
          throw new Error(message);
        }
        return response.json() as Promise<ProductWithImages>;
      }
      return updateProduct(id, data);
    },
    {
      queryKey: ["products"],
      extraInvalidateKeys: (variables) => [["products", variables.id]],
      queuedMessage: "Product update queued in runtime queue.",
      processedMessage: "Queued product update completed.",
      errorMessage: "Failed to update product",
      onQueued: (variables) => addQueuedProductId(variables.id),
      onProcessed: (variables) => removeQueuedProductId(variables.id),
    }
  );
}

export function useDeleteProductMutation(): UseMutationResult<DeleteResponse | null, Error, string, unknown> {
  return useOfflineMutation(
    (id: string) => deleteProduct(id) as Promise<DeleteResponse>,
    {
      queryKey: ["products"],
      extraInvalidateKeys: [["products-count"]],
      queuedMessage: "Product deletion queued in runtime queue.",
      processedMessage: "Queued product deletion completed.",
      errorMessage: "Failed to delete product",
      onQueued: (id) => addQueuedProductId(id),
      onProcessed: (id) => removeQueuedProductId(id),
    }
  );
}

export function useBulkDeleteProductsMutation(): UseMutationResult<{ success: boolean } | null, Error, string[], unknown> {
  return useOfflineMutation(
    async (ids: string[]): Promise<{ success: boolean }> => {
      const responses = await Promise.all(
        ids.map((id: string) => deleteProduct(id))
      );
      if (responses.some((r: { success: boolean }) => !r.success)) throw new Error("Failed to delete some products");
      return { success: true };
    },
    {
      queryKey: ["products"],
      extraInvalidateKeys: [["products-count"]],
      queuedMessage: "Product deletion queued in runtime queue.",
      processedMessage: "Queued product deletion completed.",
      errorMessage: "Failed to delete some products",
      onQueued: (ids) => ids.forEach((id) => addQueuedProductId(id)),
      onProcessed: (ids) => ids.forEach((id) => removeQueuedProductId(id)),
    }
  );
}

// --- Composite Hook ---

export interface UseProductDataProps {
  refreshTrigger?: number;
  initialCatalogFilter?: string | null;
  initialPageSize?: number | null;
  preferencesLoaded: boolean;
  currencyCode?: string | null;
  priceGroups?: unknown[];
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
  const hasInitialized = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (preferencesLoaded && !hasInitialized.current) {
      timer = setTimeout(() => {
        if (initialCatalogFilter) setCatalogFilter(initialCatalogFilter);
        if (initialPageSize) setPageSize(initialPageSize);
        hasInitialized.current = true;
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [preferencesLoaded, initialCatalogFilter, initialPageSize]);

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

  // Keep pagination valid when filters change.
  // We use the adjustment during render pattern to avoid cascading renders in useEffect.
  const currentFiltersSignature = JSON.stringify({
    search,
    sku,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    catalogFilter,
    pageSize,
  });

  const [lastFiltersSignature, setLastFiltersSignature] = useState(currentFiltersSignature);

  if (lastFiltersSignature !== currentFiltersSignature) {
    setLastFiltersSignature(currentFiltersSignature);
    setPage(1);
  }

  // Clamp page when current page no longer exists after count change.
  if (page > 1 && totalPages > 0 && page > totalPages) {
    setPage(totalPages);
  }

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
