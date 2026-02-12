/* eslint-disable */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

// Hook for query normalization and relationships
export function useNormalizedQuery<T extends { id: string }>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T[]>
): any {
  const query = useQuery({
    queryKey,
    queryFn,
    select: (data: T[]) => {
      // Normalize data by ID
      const byId = data.reduce((acc: Record<string, T>, item: T) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, T>);

      const allIds = data.map((item: T) => item.id);

      return { byId, allIds };
    },
  });

  const selectById = useCallback((id: string): T | undefined => {
    return query.data?.byId[id];
  }, [query.data]);

  const selectMany = useCallback((ids: string[]): T[] => {
    return ids.map((id: string) => query.data?.byId[id]).filter((item): item is T => Boolean(item));
  }, [query.data]);

  return {
    ...query,
    selectById,
    selectMany,
    normalized: query.data,
  };
}

// Hook for query composition and data transformation
export function useComposedQuery<T, R>(
  baseQuery: { queryKey: readonly unknown[]; queryFn: () => Promise<T> },
  transformer: (data: T) => R,
  dependencies: readonly unknown[] = []
): any {
  return useQuery({
    queryKey: [...baseQuery.queryKey, 'composed', ...dependencies],
    queryFn: baseQuery.queryFn,
    select: transformer,
  });
}

// Hook for query aggregation
export function useAggregatedQuery<T>(
  queries: Array<{ queryKey: readonly unknown[]; queryFn: () => Promise<T> }>,
  aggregator: (results: T[]) => any
): any {
  const queryResults = queries.map(({ queryKey, queryFn }) =>
    useQuery({ queryKey, queryFn })
  );

  return useMemo((): any => {
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

    const aggregatedData = aggregator(queryResults.map(q => q.data!));

    return {
      data: aggregatedData,
      isLoading: false,
      isError: false,
      error: null,
    };
  }, [queryResults, aggregator]);
}
