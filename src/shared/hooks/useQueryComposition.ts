"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

// Hook for query normalization and relationships
export function useNormalizedQuery<T extends { id: string }>(
  queryKey: unknown[],
  queryFn: () => Promise<T[]>,
  options?: { 
    relationships?: Record<string, string[]>;
    selectById?: (id: string) => unknown[];
  }
) {
  const query = useQuery({
    queryKey,
    queryFn,
    select: (data) => {
      // Normalize data by ID
      const byId = data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, T>);

      const allIds = data.map(item => item.id);

      return { byId, allIds };
    },
  });

  const selectById = useCallback((id: string) => {
    return query.data?.byId[id];
  }, [query.data]);

  const selectMany = useCallback((ids: string[]) => {
    return ids.map(id => query.data?.byId[id]).filter(Boolean);
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
  baseQuery: { queryKey: unknown[]; queryFn: () => Promise<T> },
  transformer: (data: T) => R,
  dependencies: unknown[] = []
) {
  return useQuery({
    queryKey: [...baseQuery.queryKey, 'composed', ...dependencies],
    queryFn: baseQuery.queryFn,
    select: transformer,
  });
}

// Hook for query aggregation
export function useAggregatedQuery<T>(
  queries: Array<{ queryKey: unknown[]; queryFn: () => Promise<T> }>,
  aggregator: (results: T[]) => any
) {
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

    const aggregatedData = aggregator(queryResults.map(q => q.data!));

    return {
      data: aggregatedData,
      isLoading: false,
      isError: false,
      error: null,
    };
  }, [queryResults, aggregator]);
}
