'use client';

// useProductsPagedDebugLogging: lightweight hook that computes a small debug
// snapshot of paged product query state and logs state transitions (throttled)
// to aid diagnosing flakiness and performance regressions in the products list.
import { useEffect, useMemo, useRef } from 'react';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import type { ProductWithImages } from '@/shared/contracts/products/product';

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

type ProductsPagedDebugQuery = {
  isPending: boolean;
  isFetching: boolean;
  data?: { items?: ProductWithImages[]; total?: number };
  error?: unknown;
  dataUpdatedAt?: number;
  errorUpdatedAt?: number;
};

const readFiniteNumber = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const readProductsPagedItemsCount = (query: ProductsPagedDebugQuery): number =>
  query.data?.items?.length ?? 0;

const readProductsPagedTotal = (query: ProductsPagedDebugQuery): number =>
  query.data?.total ?? 0;

const readProductsPagedErrorMessage = (query: ProductsPagedDebugQuery): string | null =>
  query.error instanceof Error ? query.error.message : null;

const buildProductsPagedDebugSnapshot = (args: {
  enabled: boolean;
  queryKey: readonly unknown[];
  query: ProductsPagedDebugQuery;
}): ProductsPagedDebugSnapshot => ({
  queryKey: JSON.stringify(args.queryKey),
  enabled: args.enabled,
  isPending: args.query.isPending,
  isFetching: args.query.isFetching,
  itemsCount: readProductsPagedItemsCount(args.query),
  total: readProductsPagedTotal(args.query),
  hasError: args.query.error !== null && args.query.error !== undefined,
  errorMessage: readProductsPagedErrorMessage(args.query),
  dataUpdatedAt: readFiniteNumber(args.query.dataUpdatedAt),
  errorUpdatedAt: readFiniteNumber(args.query.errorUpdatedAt),
});

const DEBUG_SNAPSHOT_FIELDS = [
  'queryKey',
  'enabled',
  'isPending',
  'isFetching',
  'itemsCount',
  'total',
  'hasError',
  'errorMessage',
  'dataUpdatedAt',
  'errorUpdatedAt',
] as const satisfies ReadonlyArray<keyof ProductsPagedDebugSnapshot>;

const hasProductsPagedDebugSnapshotChanged = (
  previousSnapshot: ProductsPagedDebugSnapshot | null,
  debugSnapshot: ProductsPagedDebugSnapshot
): boolean =>
  previousSnapshot === null ||
  DEBUG_SNAPSHOT_FIELDS.some((field) => previousSnapshot[field] !== debugSnapshot[field]);

export function useProductsPagedDebugLogging(args: {
  enabled: boolean;
  queryKey: readonly unknown[];
  query: ProductsPagedDebugQuery;
}): string {
  const { enabled, queryKey, query } = args;
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
    if (!hasProductsPagedDebugSnapshotChanged(previousSnapshot, debugSnapshot)) {
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

  return debugSnapshot.queryKey;
}
