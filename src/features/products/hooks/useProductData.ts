'use client';

import { useQueries, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import { 
  countProducts,
  createProduct, 
  getProducts,
  updateProduct, 
  deleteProduct 
} from '@/features/products/api';
import {
  type UseProductsFilters,
  type UseProductsOptions,
  useProducts as useProductsQuery,
  useProductsCount as useProductsCountQuery,
} from '@/features/products/hooks/useProductsQuery';
import { addQueuedProductId, removeQueuedProductId } from '@/features/products/state/queued-product-ops';
import type { 
  ProductWithImages, 
} from '@/features/products/types';
import { badRequestError, notFoundError, operationFailedError } from '@/shared/errors/app-error';
import { useOfflineMutation } from '@/shared/hooks/offline/useOfflineMutation';
import { api } from '@/shared/lib/api-client';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { DeleteResponse } from '@/shared/types/api/api';

import {
  getProductCountQueryKey,
  getProductListQueryKey,
  getProductDetailQueryKey,
  invalidateProductsAndCounts,
  productsAllQueryKey,
  productsCountsQueryKey,
} from './productCache';

// --- Queries ---

export type { UseProductsFilters };

export function useProducts(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
) {
  return useProductsQuery(filters, options);
}

export function useProductsCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
) {
  return useProductsCountQuery(filters, options);
}

// --- Mutations ---

export function useCreateProductMutation(): UseMutationResult<unknown, Error, FormData, unknown> {
  return useOfflineMutation(
    (formData: FormData) => createProduct(formData),
    {
      queryKey: productsAllQueryKey,
      extraInvalidateKeys: [productsCountsQueryKey],
      queuedMessage: 'Product creation queued in runtime queue.',
      processedMessage: 'Queued product creation completed.',
      errorMessage: 'Failed to create product',
    }
  );
}

export function useUpdateProductMutation(): UseMutationResult<
  ProductWithImages | null,
  Error,
  { id: string; data: Partial<ProductWithImages> | FormData; originalSku?: string | null },
  unknown
  > {
  const parseUpdateError = async (response: Response): Promise<string> => {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: unknown;
    };
    let message = errorData.error || 'Failed to update product';
    if (Array.isArray(errorData.details) && errorData.details.length > 0) {
      const detailMessages = errorData.details
        .slice(0, 3)
        .map((d: { field?: unknown; message?: unknown }) => {
          const field = typeof d.field === 'string' && d.field ? d.field : 'field';
          const msg = typeof d.message === 'string' && d.message ? d.message : 'invalid';
          return `${field}: ${msg}`;
        })
        .join(', ');
      if (detailMessages) message = `${message} (${detailMessages})`;
    }
    return message;
  };

  const resolveProductIdBySku = async (originalSku?: string | null): Promise<string | null> => {
    const normalizedSku =
      typeof originalSku === 'string' ? originalSku.trim().toUpperCase() : '';
    if (!normalizedSku) return null;

    let products: ProductWithImages[] = [];
    try {
      products = await api.get<ProductWithImages[]>(
        `/api/products?sku=${encodeURIComponent(normalizedSku)}`,
        { cache: 'no-store', logError: false }
      );
    } catch {
      return null;
    }
    const exactMatches = products.filter((product: ProductWithImages): boolean =>
      typeof product.sku === 'string' && product.sku.trim().toUpperCase() === normalizedSku
    );

    return exactMatches.length === 1 ? exactMatches[0]!.id : null;
  };

  return useOfflineMutation(
    async ({
      id,
      data,
      originalSku,
    }: {
      id: string;
      data: Partial<ProductWithImages> | FormData;
      originalSku?: string | null;
    }): Promise<ProductWithImages> => {
      if (data instanceof FormData) {
        let targetId = id;
        let response = await fetch(`/api/products/${targetId}`, {
          method: 'PUT',
          body: data,
        });

        if (response.status === 404) {
          const resolvedId = await resolveProductIdBySku(originalSku);
          if (resolvedId && resolvedId !== targetId) {
            targetId = resolvedId;
            response = await fetch(`/api/products/${targetId}`, {
              method: 'PUT',
              body: data,
            });
          }
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw notFoundError(
              'Product not found. It may have been moved or deleted. Refresh the product list and try again.'
            );
          }
          throw badRequestError(await parseUpdateError(response));
        }
        return response.json() as Promise<ProductWithImages>;
      }
      return updateProduct(id, data);
    },
    {
      queryKey: productsAllQueryKey,
      extraInvalidateKeys: (variables: {
        id: string;
        data: Partial<ProductWithImages> | FormData;
        originalSku?: string | null;
      }) => [getProductDetailQueryKey(variables.id)],
      queuedMessage: 'Product update queued in runtime queue.',
      processedMessage: 'Queued product update completed.',
      errorMessage: 'Failed to update product',
      onQueued: (variables: {
        id: string;
        data: Partial<ProductWithImages> | FormData;
        originalSku?: string | null;
      }) => addQueuedProductId(variables.id),
      onProcessed: (variables: {
        id: string;
        data: Partial<ProductWithImages> | FormData;
        originalSku?: string | null;
      }) => removeQueuedProductId(variables.id),
    }
  );
}

export function useDeleteProductMutation(): UseMutationResult<DeleteResponse | null, Error, string, unknown> {
  return useOfflineMutation(
    (id: string) => deleteProduct(id) as Promise<DeleteResponse>,
    {
      queryKey: productsAllQueryKey,
      extraInvalidateKeys: [productsCountsQueryKey],
      queuedMessage: 'Product deletion queued in runtime queue.',
      processedMessage: 'Queued product deletion completed.',
      errorMessage: 'Failed to delete product',
      onQueued: (id: string) => addQueuedProductId(id),
      onProcessed: (id: string) => removeQueuedProductId(id),
    }
  );
}

export function useBulkDeleteProductsMutation(): UseMutationResult<{ success: boolean } | null, Error, string[], unknown> {
  return useOfflineMutation(
    async (ids: string[]): Promise<{ success: boolean }> => {
      const responses = await Promise.all(
        ids.map((id: string) => deleteProduct(id))
      );
      if (responses.some((r: { success: boolean }) => !r.success)) {
        throw operationFailedError('Failed to delete some products');
      }
      return { success: true };
    },
    {
      queryKey: productsAllQueryKey,
      extraInvalidateKeys: [productsCountsQueryKey],
      queuedMessage: 'Product deletion queued in runtime queue.',
      processedMessage: 'Queued product deletion completed.',
      errorMessage: 'Failed to delete some products',
      onQueued: (ids: string[]) => ids.forEach((id: string) => addQueuedProductId(id)),
      onProcessed: (ids: string[]) => ids.forEach((id: string) => removeQueuedProductId(id)),
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
  description: string;
  setDescription: (s: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
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
  const [search, setSearch] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [catalogFilter, setCatalogFilter] = useState(initialCatalogFilter || 'all');
  const hasInitialized = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
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
    description: description || undefined,
    categoryId: categoryId || undefined,
    minPrice,
    maxPrice,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
    catalogId: catalogFilter === 'all' ? undefined : catalogFilter,
    searchLanguage: searchLanguage || undefined,
  }), [search, sku, description, categoryId, minPrice, maxPrice, startDate, endDate, page, pageSize, catalogFilter, searchLanguage]);

  // Use parallel queries
  const results = useQueries({
    queries: [
      {
        queryKey: normalizeQueryKey(getProductListQueryKey(filters)),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<ProductWithImages[]> => getProducts(filters, signal),
        enabled: preferencesLoaded,
        staleTime: 10_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      {
        queryKey: normalizeQueryKey(getProductCountQueryKey(filters)),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<number> => countProducts(filters, signal),
        enabled: preferencesLoaded,
        staleTime: 10_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    ],
  });

  const productsQuery = results[0];
  const countQuery = results[1];

  const totalPages = useMemo(() => {
    const total = countQuery.data || 0;
    return Math.ceil(total / pageSize);
  }, [countQuery.data, pageSize]);

  // Keep pagination valid when filters change.
  useEffect(() => {
    setPage(1);
  }, [search, sku, description, categoryId, minPrice, maxPrice, startDate, endDate, catalogFilter, pageSize]);

  // Clamp page when current page no longer exists after count change.
  useEffect(() => {
    if (page > 1 && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const refresh = useCallback(() => {
    void invalidateProductsAndCounts(queryClient);
  }, [queryClient]);

  // Invalidate when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  const handleSetPage = useCallback((p: number) => setPage(p), []);
  const handleSetPageSize = useCallback((size: number) => setPageSize(size), []);
  const handleSetSearch = useCallback((s: string) => setSearch(s), []);
  const handleSetSku = useCallback((s: string) => setSku(s), []);
  const handleSetDescription = useCallback((s: string) => setDescription(s), []);
  const handleSetCategoryId = useCallback((id: string) => setCategoryId(id), []);
  const handleSetMinPrice = useCallback((p: number | undefined) => setMinPrice(p), []);
  const handleSetMaxPrice = useCallback((p: number | undefined) => setMaxPrice(p), []);
  const handleSetStartDate = useCallback((s: string | undefined) => setStartDate(s), []);
  const handleSetEndDate = useCallback((s: string | undefined) => setEndDate(s), []);
  const handleSetCatalogFilter = useCallback((f: string) => setCatalogFilter(f), []);

  return {
    data: productsQuery.data || [],
    totalPages,
    page,
    setPage: handleSetPage,
    pageSize,
    setPageSize: handleSetPageSize,
    search,
    setSearch: handleSetSearch,
    sku,
    setSku: handleSetSku,
    description,
    setDescription: handleSetDescription,
    categoryId,
    setCategoryId: handleSetCategoryId,
    minPrice,
    setMinPrice: handleSetMinPrice,
    maxPrice,
    setMaxPrice: handleSetMaxPrice,
    startDate,
    setStartDate: handleSetStartDate,
    endDate,
    setEndDate: handleSetEndDate,
    catalogFilter,
    setCatalogFilter: handleSetCatalogFilter,
    loadError: productsQuery.error || countQuery.error,
    isLoading: productsQuery.isPending || countQuery.isPending,
    isFetching: productsQuery.isFetching || countQuery.isFetching,
    refresh,
  };
}
