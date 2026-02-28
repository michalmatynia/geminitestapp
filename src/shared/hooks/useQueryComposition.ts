'use client';

import { useCallback, useMemo } from 'react';

import { createListQueryV2 } from '@/shared/lib/query-factories-v2';

import type { UseQueryResult } from '@tanstack/react-query';

// Hook for query normalization and relationships
export function useNormalizedQuery<T extends { id: string }>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T[]>
): UseQueryResult<T[], Error> & {
  selectById: (id: string) => T | undefined;
  selectMany: (ids: string[]) => T[];
  normalized: { byId: Record<string, T>; allIds: string[] } | undefined;
} {
  const query = createListQueryV2<T, T[]>({
    queryKey,
    queryFn,
    select: (data: T[]) => data, // Keep original data structure for the main query result
    meta: {
      source: 'shared.hooks.useNormalizedQuery',
      operation: 'list',
      resource: 'normalized-query',
      domain: 'global',
      tags: ['query', 'normalized'],
    },
  });

  // Derived normalized state
  const normalized = useMemo(() => {
    if (!query.data) return undefined;
    const byId = query.data.reduce(
      (acc: Record<string, T>, item: T) => {
        acc[item.id] = item;
        return acc;
      },
      {} as Record<string, T>
    );
    const allIds = query.data.map((item: T) => item.id);
    return { byId, allIds };
  }, [query.data]);

  const selectById = useCallback(
    (id: string): T | undefined => {
      return normalized?.byId[id];
    },
    [normalized]
  );

  const selectMany = useCallback(
    (ids: string[]): T[] => {
      return ids
        .map((id: string) => normalized?.byId[id])
        .filter((item): item is T => Boolean(item));
    },
    [normalized]
  );

  return {
    ...query,
    selectById,
    selectMany,
    normalized,
  };
}

// Hook for query composition and data transformation
export function useComposedQuery<T, R>(
  baseQuery: { queryKey: readonly unknown[]; queryFn: () => Promise<T> },
  transformer: (data: T) => R,
  dependencies: readonly unknown[] = []
): UseQueryResult<R, Error> {
  return createListQueryV2<R, R>({
    queryKey: [...baseQuery.queryKey, 'composed', ...dependencies],
    queryFn: async (): Promise<R> => transformer(await baseQuery.queryFn()),
    meta: {
      source: 'shared.hooks.useComposedQuery',
      operation: 'list',
      resource: 'composed-query',
      domain: 'global',
      tags: ['query', 'composed'],
    },
  });
}

// Hook for query aggregation
export function useAggregatedQuery<T, R>(
  queries: Array<{ queryKey: readonly unknown[]; queryFn: () => Promise<T> }>,
  aggregator: (results: T[]) => R
): {
  data: R | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
} {
  const queryResults = queries.map(({ queryKey, queryFn }) =>
    createListQueryV2<T, T>({
      queryKey,
      queryFn,
      meta: {
        source: 'shared.hooks.useAggregatedQuery',
        operation: 'list',
        resource: 'aggregated-query',
        domain: 'global',
        tags: ['query', 'aggregated'],
      },
    })
  );

  return useMemo(() => {
    const allLoaded = queryResults.every((q) => q.isSuccess);
    const anyLoading = queryResults.some((q) => q.isLoading);
    const anyError = queryResults.some((q) => q.isError);

    if (!allLoaded) {
      return {
        data: undefined,
        isLoading: anyLoading,
        isError: anyError,
        error: queryResults.find((q) => q.error)?.error,
      };
    }

    const aggregatedData = aggregator(queryResults.map((q) => q.data));

    return {
      data: aggregatedData,
      isLoading: false,
      isError: false,
      error: null,
    };
  }, [queryResults, aggregator]);
}
