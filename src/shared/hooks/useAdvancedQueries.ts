/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/typedef, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types */
"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

// Hook for dependent queries - execute queries in sequence
export function useDependentQueries<T1, T2, T3>(
  firstQuery: { queryKey: unknown[]; queryFn: () => Promise<T1>; enabled?: boolean },
  secondQuery: { queryKey: unknown[]; queryFn: (data: T1) => Promise<T2> },
  thirdQuery?: { queryKey: unknown[]; queryFn: (data: T2) => Promise<T3> }
): {
  first: any;
  second: any;
  third: any;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const first = useQuery({
    queryKey: firstQuery.queryKey,
    queryFn: firstQuery.queryFn,
    enabled: firstQuery.enabled !== false,
  });

  const second = useQuery({
    queryKey: [...secondQuery.queryKey, first.data],
    queryFn: () => secondQuery.queryFn(first.data!),
    enabled: !!first.data && first.isSuccess,
  });

  const third = useQuery({
    queryKey: thirdQuery ? [...thirdQuery.queryKey, second.data] : [],
    queryFn: thirdQuery ? () => thirdQuery.queryFn(second.data!) : undefined,
    enabled: !!thirdQuery && !!second.data && second.isSuccess,
  });

  return {
    first,
    second,
    third: thirdQuery ? third : null,
    isLoading: Boolean(first.isLoading || (first.isSuccess && second.isLoading) || 
               (thirdQuery && second.isSuccess && third.isLoading)),
    isError: Boolean(first.isError || second.isError || (thirdQuery && third.isError)),
    error: (first.error || second.error || (thirdQuery && third.error)) as Error | null,
  };
}

// Hook for parallel queries with combined loading state
export function useParallelQueries<T extends Record<string, any>>(
  queries: {
    [K in keyof T]: {
      queryKey: unknown[];
      queryFn: () => Promise<T[K]>;
      enabled?: boolean;
    };
  }
): {
  data: T;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  isSuccess: boolean;
  refetch: () => Promise<unknown[]>;
} {
  const queryResults = useQueries({
    queries: Object.entries(queries).map(([, config]) => ({
      queryKey: config.queryKey,
      queryFn: config.queryFn,
      enabled: config.enabled !== false,
    })),
  });

  const results = useMemo(() => {
    const data = {} as T;
    const keys = Object.keys(queries);
    
    queryResults.forEach((result, index) => {
      const key = keys[index] as keyof T;
      data[key] = result.data as T[keyof T];
    });

    return {
      data,
      isLoading: queryResults.some(q => q.isLoading),
      isError: queryResults.some(q => q.isError),
      errors: queryResults.filter(q => q.isError).map(q => q.error),
      isSuccess: queryResults.every(q => q.isSuccess),
      refetch: async () => await Promise.all(queryResults.map(q => q.refetch())),
    };
  }, [queryResults, queries]);

  return results;
}

// Hook for conditional queries based on user permissions or feature flags
export function useConditionalQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  conditions: {
    userRole?: string[];
    featureFlag?: string;
    permission?: string;
    customCondition?: () => boolean;
  }
) {
  const enabled = useMemo(() => {
    // Check user role
    if (conditions.userRole) {
      const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      if (!userRole || !conditions.userRole.includes(userRole)) {
        return false;
      }
    }

    // Check feature flag
    if (conditions.featureFlag) {
      const flags = typeof window !== 'undefined' ? 
        JSON.parse(localStorage.getItem('featureFlags') || '{}') : {};
      if (!flags[conditions.featureFlag]) {
        return false;
      }
    }

    // Check permission
    if (conditions.permission) {
      const permissions = typeof window !== 'undefined' ? 
        JSON.parse(localStorage.getItem('permissions') || '[]') : [];
      if (!permissions.includes(conditions.permission)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.customCondition && !conditions.customCondition()) {
      return false;
    }

    return true;
  }, [conditions]);

  return useQuery({
    queryKey,
    queryFn,
    enabled,
  });
}
