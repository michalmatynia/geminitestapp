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

export function useProductsPagedDebugLogging(args: {
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

  return debugSnapshot.queryKey;
}
