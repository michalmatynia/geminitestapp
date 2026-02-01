"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { getProducts, countProducts, createProduct, updateProduct, deleteProduct } from "@/features/products/api";
import type { ProductWithImages } from "@/features/products/types";
import type { DeleteResponse } from "@/shared/types/api";
import type { PriceGroupWithDetails } from "@/features/products/types"; // Assuming this type exists and is imported correctly
import type { UseProductsFilters } from "@/features/products/hooks/useProductsQuery"; // Assuming this type exists

// --- TanStack Query Hooks ---

export function useProductsQuery(
  filters: UseProductsFilters,
  options: { enabled?: boolean } = {},
): UseQueryResult<ProductWithImages[], Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
    enabled,
  });
}

export function useProductsCountQuery(
  filters: UseProductsFilters,
  options: { enabled?: boolean } = {},
): UseQueryResult<number, Error> {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["products-count", filters],
    queryFn: () => countProducts(filters),
    enabled,
  });
}

export function useProductsWithCount(
  filters: UseProductsFilters,
  options: { enabled?: boolean } = {},
): {
  products: ProductWithImages[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<void>;
} {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const productsQuery = useProductsQuery(filters, { enabled });
  const countQuery = useProductsCountQuery(filters, { enabled });

  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["products-count"] }),
    ]);
  }, [queryClient]);

  return {
    products: productsQuery.data ?? [],
    total: countQuery.data ?? 0,
    isLoading: productsQuery.isPending || countQuery.isPending,
    isFetching: productsQuery.isFetching || countQuery.isFetching,
    error: productsQuery.error || countQuery.error,
    refetch,
  };
}


// --- Mutations ---

export function useCreateProductMutation(): UseMutationResult<unknown, Error, FormData, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData): Promise<unknown> => {
      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

export function useUpdateProductMutation(): UseMutationResult<ProductWithImages, Error, { id: string; data: Partial<ProductWithImages> }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductWithImages> }): Promise<ProductWithImages> => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return (await response.json()) as ProductWithImages;
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

export function useDeleteProductMutation(): UseMutationResult<DeleteResponse, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return (await response.json()) as DeleteResponse;
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);
    },
  });
}

// --- Hook Logic ---

function convertPriceFilterToBase(
  filterValue: number | undefined,
  currencyCode: string | undefined,
  priceGroups: PriceGroupWithDetails[] | undefined,
): number | undefined {
  if (filterValue === undefined || !currencyCode || !priceGroups?.length) {
    return filterValue;
  }

  const targetGroup = priceGroups.find(
    (g) => g.currency?.code === currencyCode || g.currencyCode === currencyCode,
  );

  if (!targetGroup) {
    return filterValue;
  }

  if (targetGroup.type === "dependent" && targetGroup.sourceGroupId) {
    const multiplier = targetGroup.priceMultiplier || 1;
    const addToPrice = targetGroup.addToPrice || 0;
    return Math.round((filterValue - addToPrice) / multiplier);
  }

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
}: {
  refreshTrigger: number;
  initialCatalogFilter?: string;
  initialPageSize?: number;
  preferencesLoaded?: boolean;
  currencyCode?: string;
  priceGroups?: PriceGroupWithDetails[];
  searchLanguage?: string;
}): ProductDataHookResult {
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

  const [initialSyncComplete, setInitialSyncComplete] = useState(false);

  useEffect(() => {
    if (preferencesLoaded && !initialSyncComplete) {
      setInitialSyncComplete(true);
      if (catalogFilter !== initialCatalogFilter) {
        setCatalogFilter(initialCatalogFilter);
      }
      if (pageSize !== initialPageSize) {
        setPageSize(initialPageSize);
      }
    }
  }, [preferencesLoaded, initialSyncComplete, catalogFilter, initialCatalogFilter, pageSize, initialPageSize, setCatalogFilter, setPageSize]);

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

  // TanStack Query for products and count
  const productsQuery = useProductsQuery(filters, {
    enabled: preferencesLoaded && initialSyncComplete && filters.page !== undefined && filters.pageSize !== undefined,
  });

  const countQuery = useProductsCountQuery(filters, {
    enabled: preferencesLoaded && initialSyncComplete && filters.page !== undefined && filters.pageSize !== undefined,
  });

  const refetchProducts = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["products-count"] }),
    ]);
  }, [queryClient]);

  const loadError = useMemo(() => {
    if (!productsQuery.error && !countQuery.error) return null;
    const error = productsQuery.error || countQuery.error;
    return error instanceof Error ? error.message : "Failed to load products";
  }, [productsQuery.error, countQuery.error]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((countQuery.data ?? 0) / pageSize));
  }, [countQuery.data, pageSize]);

  // Update mutations from previous hook
  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();

  return {
    data: productsQuery.data ?? [],
    total: countQuery.data ?? 0,
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
    isLoading: productsQuery.isPending || countQuery.isPending,
    isFetching: productsQuery.isFetching || countQuery.isFetching,
    refetchProducts,
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
  };
}