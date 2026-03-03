'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createListQueryV2, createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';

// Hook for dependent queries - execute queries in sequence
export function useDependentQueries<T1, T2, T3>(
  firstQuery: { queryKey: unknown[]; queryFn: () => Promise<T1>; enabled?: boolean },
  secondQuery: { queryKey: unknown[]; queryFn: (data: T1) => Promise<T2> },
  thirdQuery?: { queryKey: unknown[]; queryFn: (data: T2) => Promise<T3> },
  options?: { domain?: TanstackFactoryDomain }
): {
  first: UseQueryResult<T1, Error>;
  second: UseQueryResult<T2, Error>;
  third: UseQueryResult<T3, Error> | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const domain = options?.domain ?? 'global';

  const first = createListQueryV2<T1, T1>({
    queryKey: normalizeQueryKey(firstQuery.queryKey),
    queryFn: firstQuery.queryFn,
    enabled: firstQuery.enabled !== false,
    meta: {
      source: 'shared.hooks.query.useDependentQueries.first',
      operation: 'list',
      resource: 'dependent-query',
      domain,
      tags: ['dependent', 'first'],
    },
  });

  const second = createListQueryV2<T2, T2>({
    queryKey: normalizeQueryKey([...secondQuery.queryKey, first.data]),
    queryFn: () => secondQuery.queryFn(first.data!),
    enabled: !!first.data && first.isSuccess,
    meta: {
      source: 'shared.hooks.query.useDependentQueries.second',
      operation: 'list',
      resource: 'dependent-query',
      domain,
      tags: ['dependent', 'second'],
    },
  });

  const third = createListQueryV2<T3, T3>({
    queryKey: normalizeQueryKey(
      thirdQuery ? [...thirdQuery.queryKey, second.data] : ['__empty_third__']
    ),
    queryFn: thirdQuery
      ? () => thirdQuery.queryFn(second.data!)
      : () => Promise.resolve(null as unknown as T3),
    enabled: !!thirdQuery && !!second.data && second.isSuccess,
    meta: {
      source: 'shared.hooks.query.useDependentQueries.third',
      operation: 'list',
      resource: 'dependent-query',
      domain,
      tags: ['dependent', 'third'],
    },
  });

  return {
    first,
    second,
    third: thirdQuery ? third : null,
    isLoading: Boolean(
      first.isLoading ||
      (first.isSuccess && second.isLoading) ||
      (thirdQuery && second.isSuccess && third.isLoading)
    ),
    isError: Boolean(first.isError || second.isError || (thirdQuery && third.isError)),
    error: (first.error || second.error || (thirdQuery && third.error)) as Error | null,
  };
}

// Hook for parallel queries with combined loading state
export function useParallelQueries<T extends Record<string, unknown>>(
  queries: {
    [K in keyof T]: {
      queryKey: unknown[];
      queryFn: () => Promise<T[K]>;
      enabled?: boolean;
    };
  },
  options?: { domain?: TanstackFactoryDomain }
): {
  data: T;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  isSuccess: boolean;
  refetch: () => Promise<unknown[]>;
} {
  const domain = options?.domain ?? 'global';
  const keys = Object.keys(queries) as Array<keyof T>;
  const queryResults = createMultiQueryV2({
    queries: keys.map((key) => ({
      queryKey: normalizeQueryKey(queries[key].queryKey),
      queryFn: queries[key].queryFn,
      enabled: queries[key].enabled !== false,
      meta: {
        source: `shared.hooks.query.useParallelQueries.${String(key)}`,
        operation: 'list',
        resource: 'parallel-query',
        domain,
        tags: ['parallel', String(key)],
      },
    })),
  });

  const results = useMemo(() => {
    const data = {} as T;

    queryResults.forEach((result: UseQueryResult<unknown, Error>, index: number) => {
      const key = keys[index];
      if (key) {
        data[key] = result.data as T[keyof T];
      }
    });

    return {
      data,
      isLoading: queryResults.some((q: UseQueryResult<unknown, Error>) => q.isLoading),
      isError: queryResults.some((q: UseQueryResult<unknown, Error>) => q.isError),
      errors: queryResults
        .filter((q: UseQueryResult<unknown, Error>) => q.isError)
        .map((q: UseQueryResult<unknown, Error>) => q.error as Error),
      isSuccess: queryResults.every((q: UseQueryResult<unknown, Error>) => q.isSuccess),
      refetch: async () =>
        await Promise.all(queryResults.map((q: UseQueryResult<unknown, Error>) => q.refetch())),
    };
  }, [queryResults, keys]);

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
  },
  options?: { domain?: TanstackFactoryDomain }
) {
  const domain = options?.domain ?? 'global';
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
      const flagsStr = typeof window !== 'undefined' ? localStorage.getItem('featureFlags') : null;
      const flags = flagsStr ? (JSON.parse(flagsStr) as Record<string, boolean>) : {};
      if (!flags[conditions.featureFlag]) {
        return false;
      }
    }

    // Check permission
    if (conditions.permission) {
      const permissionsStr =
        typeof window !== 'undefined' ? localStorage.getItem('permissions') : null;
      const permissions = permissionsStr ? (JSON.parse(permissionsStr) as string[]) : [];
      if (!Array.isArray(permissions) || !permissions.includes(conditions.permission)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.customCondition && !conditions.customCondition()) {
      return false;
    }

    return true;
  }, [conditions]);

  return createListQueryV2<T, T>({
    queryKey: normalizeQueryKey(queryKey),
    queryFn,
    enabled,
    meta: {
      source: 'shared.hooks.query.useConditionalQuery',
      operation: 'list',
      resource: 'conditional-query',
      domain,
      tags: ['conditional'],
    },
  });
}
