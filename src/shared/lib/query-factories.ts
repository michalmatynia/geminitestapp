'use client';

import { 
  useQuery, 
  useMutation,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions
} from '@tanstack/react-query';

import type { ListQuery, SingleQuery, MutationResult } from '@/shared/types/query-result-types';

/**
 * Standard configuration for list queries
 */
export interface ListQueryConfig<TData, TQueryFnData = TData[]> {
  queryKey: QueryKey;
  queryFn: () => Promise<TQueryFnData>;
  options?: Omit<UseQueryOptions<TQueryFnData, Error, TQueryFnData, QueryKey>, 'queryKey' | 'queryFn'>;
}

/**
 * Factory for creating standardized list queries
 */
export function createListQuery<TData, TQueryFnData = TData[]>(
  config: ListQueryConfig<TData, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    staleTime: 5 * 60 * 1000,
    ...config.options,
  }) as ListQuery<TData, TQueryFnData>;
}

/**
 * Standard configuration for single item queries
 */
export interface SingleQueryConfig<TData> {
  queryKey: QueryKey | ((id: string) => QueryKey);
  queryFn: () => Promise<TData>;
  id?: string | null | undefined;
  options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn'>;
}

/**
 * Factory for creating standardized single item queries
 */
export function createSingleQuery<TData>(
  config: SingleQueryConfig<TData>
): SingleQuery<TData> {
  const resolvedKey = typeof config.queryKey === 'function' 
    ? config.queryKey(config.id ?? 'none') 
    : config.queryKey;

  return useQuery({
    queryKey: resolvedKey,
    queryFn: config.queryFn,
    staleTime: 5 * 60 * 1000,
    ...config.options,
    enabled: (config.options?.enabled ?? true) && (config.id !== null && config.id !== undefined),
  }) as SingleQuery<TData>;
}

/**
 * Factory for creating standardized mutations
 */
export function createMutation<TData, TVariables>(
  config: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    options?: UseMutationOptions<TData, Error, TVariables>;
  }
): MutationResult<TData, TVariables> {
  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
  });
}

// Aliases for convenience and consistency
export const createCreateMutation = createMutation;
export const createUpdateMutation = createMutation;
export const createDeleteMutation = createMutation;
