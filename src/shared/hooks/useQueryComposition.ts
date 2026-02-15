'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// Hook for query normalization and relationships
export function useNormalizedQuery<T extends { id: string }>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T[]>
): UseQueryResult<T[], Error> & {
  selectById: (id: string) => T | undefined;
  selectMany: (ids: string[]) => T[];
  normalized: { byId: Record<string, T>; allIds: string[] } | undefined;
} {
  const query = useQuery({
    queryKey,
    queryFn,
    select: (data: T[]) => data, // Keep original data structure for the main query result
  });

  // Derived normalized state
  const normalized = useMemo(() => {
    if (!query.data) return undefined;
    const byId = query.data.reduce((acc: Record<string, T>, item: T) => {
      acc[item.id] = item;
      return acc;
    }, {} as Record<string, T>);
    const allIds = query.data.map((item: T) => item.id);
    return { byId, allIds };
  }, [query.data]);

  const selectById = useCallback((id: string): T | undefined => {
    return normalized?.byId[id];
  }, [normalized]);

  const selectMany = useCallback((ids: string[]): T[] => {
    return ids.map((id: string) => normalized?.byId[id]).filter((item): item is T => Boolean(item));
  }, [normalized]);

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
  return useQuery({
    queryKey: [...baseQuery.queryKey, 'composed', ...dependencies],
    queryFn: baseQuery.queryFn,
    select: transformer,
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
    useQuery({ queryKey, queryFn })
  );

  return useMemo(() => {
    const allLoaded = queryResults.every(q => q.isSuccess);
    const anyLoading = queryResults.some(q => q.isLoading);
    const anyError = queryResults.some(q => q.isError);

    if (!allLoaded) {
      return {
        data: undefined,
        isLoading: anyLoading,
        isError: anyError,
        error: queryResults.find(q => q.error)?.error,
      };
    }

    const aggregatedData = aggregator(queryResults.map(q => q.data as T));

    return {
      data: aggregatedData,
      isLoading: false,
      isError: false,
      error: null,
    };
  }, [queryResults, aggregator]);
}
