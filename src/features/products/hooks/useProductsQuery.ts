'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';

import { getProducts, countProducts, getProductsWithCount } from '@/features/products/api/products';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import { type ProductFilter as UseProductsFilters } from '@/shared/contracts/products/filters';
import {
  type ProductWithImages,
  productSchema,
  productWithImagesSchema,
} from '@/shared/contracts/products/product';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import {
  createListQueryV2,
  createPaginatedListQueryV2,
  createSingleQueryV2,
  prefetchQueryV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { refetchProductsAndCounts } from './productCache';

export type { UseProductsFilters };

export interface UseProductsOptions {
  enabled?: boolean;
  prefetchNextPage?: boolean;
}

// Trade-off between API load and freshness for product list queries.
// 60s keeps the UI feeling responsive while significantly reducing repeated fetches
// when users navigate in and out of the products pages.
const PRODUCTS_STALE_MS = 60_000;
const productsPagedResultSchema = z.object({
  products: z.array(productWithImagesSchema),
  total: z.number().nonnegative(),
});

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toOptionalFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const normalizePagedImageFileRecord = (input: unknown): Record<string, unknown> | undefined => {
  const record = toRecord(input);
  if (!record) return undefined;

  const filepath = toTrimmedString(record['filepath']);
  const derivedFilename = filepath.split('/').filter(Boolean).pop() ?? 'image';
  const id =
    toTrimmedString(record['id']) ||
    toTrimmedString(record['_id']) ||
    filepath ||
    derivedFilename;

  return {
    ...record,
    id,
    filename: toTrimmedString(record['filename']) || derivedFilename,
    filepath,
    mimetype: toTrimmedString(record['mimetype']) || 'application/octet-stream',
    size: toOptionalFiniteNumber(record['size']) ?? 0,
    createdAt: toTrimmedString(record['createdAt']) || undefined,
    updatedAt: toTrimmedString(record['updatedAt']) || null,
  };
};

const normalizePagedProductRecord = (input: unknown): Record<string, unknown> => {
  const record = toRecord(input) ?? {};
  const images = Array.isArray(record['images'])
    ? record['images'].map((image: unknown) => {
        const imageRecord = toRecord(image) ?? {};
        return {
          ...imageRecord,
          imageFile: normalizePagedImageFileRecord(imageRecord['imageFile']),
        };
      })
    : record['images'];

  return {
    ...record,
    images,
  };
};

const parseProductsPagedResult = (
  payload: unknown
): {
  products: ProductWithImages[];
  total: number;
} =>
  productsPagedResultSchema.parse({
    ...(toRecord(payload) ?? {}),
    products: Array.isArray(toRecord(payload)?.['products'])
      ? (toRecord(payload)?.['products'] as unknown[]).map(normalizePagedProductRecord)
      : [],
  });

const getProductsPagedQueryKey = (filters: UseProductsFilters) =>
  [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;

type ProductsPagedDebugSnapshot = {
  queryKey: string;
  enabled: boolean;
  isPending: boolean;
  isFetching: boolean;
  itemsCount: number;
  total: number;
  hasError: boolean;
  errorMessage: string | null;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
};

const buildProductsPagedDebugSnapshot = (args: {
  enabled: boolean;
  queryKey: readonly unknown[];
  query: {
    isPending: boolean;
    isFetching: boolean;
    data?: { items?: ProductWithImages[]; total?: number };
    error?: unknown;
    dataUpdatedAt?: number;
    errorUpdatedAt?: number;
  };
}): ProductsPagedDebugSnapshot => ({
  queryKey: JSON.stringify(args.queryKey),
  enabled: args.enabled,
  isPending: args.query.isPending,
  isFetching: args.query.isFetching,
  itemsCount: args.query.data?.items?.length ?? 0,
  total: args.query.data?.total ?? 0,
  hasError: Boolean(args.query.error),
  errorMessage: args.query.error instanceof Error ? args.query.error.message : null,
  dataUpdatedAt:
    typeof args.query.dataUpdatedAt === 'number' && Number.isFinite(args.query.dataUpdatedAt)
      ? args.query.dataUpdatedAt
      : 0,
  errorUpdatedAt:
    typeof args.query.errorUpdatedAt === 'number' && Number.isFinite(args.query.errorUpdatedAt)
      ? args.query.errorUpdatedAt
      : 0,
});

export function useProducts(
  filters: UseProductsFilters,
  options?: UseProductsOptions
): ListQuery<ProductWithImages> {
  const queryKey = QUERY_KEYS.products.list(filters);
  const queryFn = async (context: { signal: AbortSignal }): Promise<ProductWithImages[]> => {
    const data = await getProducts(filters, context.signal);
    return z.array(productSchema).parse(data) as ProductWithImages[];
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: options?.enabled ?? true,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products.'),
    meta: {
      source: 'products.hooks.useProducts',
      operation: 'list',
      resource: 'products',
      domain: 'products',
      queryKey,
      tags: ['products', 'list'],
      description: 'Loads products for the current filters.',
    },
  });
}

export function useProductsCount(
  filters: UseProductsFilters,
  options?: UseProductsOptions
): SingleQuery<number> {
  const id = JSON.stringify(filters);
  const queryKey = QUERY_KEYS.products.count(filters);
  const queryFn = async (context: { signal: AbortSignal }): Promise<number> =>
    countProducts(filters, context.signal);

  return createSingleQueryV2({
    id,
    queryKey,
    queryFn,
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: options?.enabled ?? true,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products count.'),
    meta: {
      source: 'products.hooks.useProductsCount',
      operation: 'detail',
      resource: 'products.count',
      domain: 'products',
      queryKey,
      tags: ['products', 'count'],
      description: 'Loads the product count for the current filters.',
    },
  });
}

export function useProductsWithCount(
  filters: UseProductsFilters,
  options: UseProductsOptions = {}
): {
  products: ProductWithImages[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  const shouldPrefetchNextPage = options?.prefetchNextPage ?? true;
  const prefetchKeyRef = useRef<string>('');

  // Single request replaces the previous two parallel queries (getProducts + countProducts).
  // The query key starts with QUERY_KEYS.products.lists() so refetchProductsAndCounts()
  // invalidates it automatically on mutations.
  const queryKey = useMemo(() => getProductsPagedQueryKey(filters), [filters]);
  const query = createPaginatedListQueryV2<ProductWithImages>({
    id: JSON.stringify(filters) + ':paged',
    queryKey,
    queryFn: async (context) => {
      try {
        const { products, total } = parseProductsPagedResult(
          await getProductsWithCount(filters, context.signal)
        );
        return { items: products, total };
      } catch (error) {
        logClientCatch(error, {
          source: 'products.hooks.useProductsWithCount',
          action: 'queryFn',
          filters,
        });
        throw error;
      }
    },
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products.'),
    meta: {
      source: 'products.hooks.useProductsWithCount',
      operation: 'list',
      resource: 'products.paged',
      domain: 'products',
      queryKey,
      tags: ['products', 'list', 'count'],
      description: 'Loads paginated products and total count for the current filters.',
    },
  });

  useEffect(() => {
    if (!enabled) return;
    if (!shouldPrefetchNextPage) return;
    if (!query.data) return;

    const currentPage = typeof filters.page === 'number' && filters.page > 0 ? filters.page : 1;
    const currentPageSize =
      typeof filters.pageSize === 'number' && filters.pageSize > 0 ? filters.pageSize : 20;
    const totalPages = Math.max(1, Math.ceil(query.data.total / currentPageSize));
    if (currentPage >= totalPages) return;

    const nextFilters: UseProductsFilters = {
      ...filters,
      page: currentPage + 1,
      pageSize: currentPageSize,
    };
    const nextQueryKey = getProductsPagedQueryKey(nextFilters);
    const prefetchKey = JSON.stringify(nextQueryKey);
    if (prefetchKeyRef.current === prefetchKey) return;
    prefetchKeyRef.current = prefetchKey;

    if (queryClient.getQueryData(nextQueryKey) !== undefined) return;

    void prefetchQueryV2(queryClient, {
      queryKey: nextQueryKey,
      queryFn: async (context) => {
        try {
          const { products, total } = parseProductsPagedResult(
            await getProductsWithCount(nextFilters, context.signal)
          );
          return { items: products, total };
        } catch (error) {
          logClientCatch(error, {
            source: 'products.hooks.useProductsWithCount',
            action: 'prefetchQueryFn',
            filters: nextFilters,
          });
          throw error;
        }
      },
      staleTime: PRODUCTS_STALE_MS,
      meta: {
        source: 'products.hooks.useProductsWithCount.prefetch',
        operation: 'list',
        resource: 'products.paged',
        domain: 'products',
        queryKey: nextQueryKey,
        tags: ['products', 'list', 'prefetch'],
        description: 'Prefetches the next product page and count.',
      },
    })();
  }, [enabled, filters, query.data, queryClient, shouldPrefetchNextPage]);

  const previousDebugSnapshotRef = useRef<ProductsPagedDebugSnapshot | null>(null);
  const debugSnapshot = useMemo(
    () =>
      buildProductsPagedDebugSnapshot({
        enabled,
        queryKey,
        query,
      }),
    [
      enabled,
      queryKey,
      query.isPending,
      query.isFetching,
      query.data,
      query.error,
      query.dataUpdatedAt,
      query.errorUpdatedAt,
    ]
  );

  useEffect(() => {
    const previousSnapshot = previousDebugSnapshotRef.current;
    if (
      previousSnapshot?.queryKey === debugSnapshot.queryKey &&
      previousSnapshot?.enabled === debugSnapshot.enabled &&
      previousSnapshot?.isPending === debugSnapshot.isPending &&
      previousSnapshot?.isFetching === debugSnapshot.isFetching &&
      previousSnapshot?.itemsCount === debugSnapshot.itemsCount &&
      previousSnapshot?.total === debugSnapshot.total &&
      previousSnapshot?.hasError === debugSnapshot.hasError &&
      previousSnapshot?.errorMessage === debugSnapshot.errorMessage &&
      previousSnapshot?.dataUpdatedAt === debugSnapshot.dataUpdatedAt &&
      previousSnapshot?.errorUpdatedAt === debugSnapshot.errorUpdatedAt
    ) {
      return;
    }

    logProductListDebug(
      'paged-query-state-change',
      {
        ...debugSnapshot,
      },
      {
        dedupeKey: 'paged-query-state-change',
        throttleMs: 500,
      }
    );
    previousDebugSnapshotRef.current = debugSnapshot;
  }, [debugSnapshot]);

  const refetch = useCallback(async (): Promise<void> => {
    logProductListDebug(
      'paged-query-refetch-requested',
      {
        queryKey: debugSnapshot.queryKey,
      },
      { dedupeKey: 'paged-query-refetch-requested', throttleMs: 250 }
    );
    await refetchProductsAndCounts(queryClient);
  }, [debugSnapshot.queryKey, queryClient]);

  return {
    products: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
