'use client';

import {
  useMutation,
  useQuery,
  type QueryFunctionContext,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  createListQueryV2,
  createMutationV2,
  createSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import { isTanstackFactoryV2Enabled } from '@/shared/lib/tanstack-factory-flags';
import { inferLegacyFactoryMeta } from '@/shared/lib/tanstack-factory-meta-inference';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/types/query-result-types';

type QueryFactoryFn<TQueryFnData, TQueryKey extends QueryKey = QueryKey> =
  | (() => Promise<TQueryFnData>)
  | ((context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>);

type ListQueryOptions<TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TQueryFnData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type SingleQueryOptions<TData, TTransformedData> = Omit<
  UseQueryOptions<TData, Error, TTransformedData, QueryKey>,
  'queryKey' | 'queryFn'
>;

/**
 * Standard configuration for list queries.
 * Supports both modern top-level query options and legacy nested `options`.
 */
export type ListQueryConfig<TData, TQueryFnData = TData[]> = {
  queryKey: QueryKey;
  queryFn: QueryFactoryFn<TQueryFnData>;
  options?: ListQueryOptions<TQueryFnData> | undefined;
} & ListQueryOptions<TQueryFnData>;

/**
 * Standard configuration for single item queries.
 * Supports both modern top-level query options and legacy nested `options`.
 */
export type SingleQueryConfig<TData, TTransformedData = TData> = {
  queryKey: QueryKey | ((id: string) => QueryKey);
  queryFn: QueryFactoryFn<TData>;
  id?: string | null | undefined;
  options?: SingleQueryOptions<TData, TTransformedData> | undefined;
} & SingleQueryOptions<TData, TTransformedData>;

type MutationFactoryConfig<TData, TVariables, TContext = unknown> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  options?: Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn'> | undefined;
};

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

const invokeQueryFactoryFn = <TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>,
  context: QueryFunctionContext<TQueryKey>
): Promise<TQueryFnData> => {
  if (queryFn.length === 0) {
    return (queryFn as () => Promise<TQueryFnData>)();
  }
  return (queryFn as (ctx: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>)(context);
};

/**
 * Factory for creating standardized list queries.
 */
export function createListQuery<TData, TQueryFnData = TData[]>(
  config: ListQueryConfig<TData, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  const { queryKey, queryFn, options: legacyOptions, ...inlineOptions } = config;
  const mergedOptions: ListQueryOptions<TQueryFnData> = {
    ...(legacyOptions ?? {}),
    ...inlineOptions,
  };
  const meta = inferLegacyFactoryMeta({
    key: queryKey,
    operation: 'list',
    source: 'legacy.query-factories.list',
    kind: 'query',
  });

  if (isTanstackFactoryV2Enabled(meta.domain)) {
    return createListQueryV2({
      queryKey,
      queryFn,
      ...mergedOptions,
      meta,
    });
  }

  return useQuery({
    staleTime: mergedOptions.staleTime ?? DEFAULT_STALE_TIME_MS,
    ...mergedOptions,
    queryKey,
    queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
  }) as ListQuery<TData, TQueryFnData>;
}

/**
 * Factory for creating standardized single item queries.
 */
export function createSingleQuery<TData, TTransformedData = TData>(
  config: SingleQueryConfig<TData, TTransformedData>
): SingleQuery<TTransformedData> {
  const {
    queryKey,
    queryFn,
    id,
    options: legacyOptions,
    ...inlineOptions
  } = config;
  const mergedOptions: SingleQueryOptions<TData, TTransformedData> = {
    ...(legacyOptions ?? {}),
    ...inlineOptions,
  };
  const resolvedKey = typeof queryKey === 'function'
    ? queryKey(id ?? 'none')
    : queryKey;
  const enabled = (mergedOptions.enabled ?? true) && (id !== null && id !== undefined);
  const meta = inferLegacyFactoryMeta({
    key: resolvedKey,
    operation: 'detail',
    source: 'legacy.query-factories.detail',
    kind: 'query',
  });

  if (isTanstackFactoryV2Enabled(meta.domain)) {
    return createSingleQueryV2({
      id,
      queryKey: resolvedKey,
      queryFn,
      ...mergedOptions,
      enabled,
      meta,
    });
  }

  return useQuery({
    staleTime: mergedOptions.staleTime ?? DEFAULT_STALE_TIME_MS,
    ...mergedOptions,
    queryKey: resolvedKey,
    queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
    enabled,
  }) as SingleQuery<TTransformedData>;
}

const createMutationWithOperation = <TData, TVariables, TContext = unknown>(
  config: MutationFactoryConfig<TData, TVariables, TContext>,
  operation: 'create' | 'update' | 'delete' | 'action',
  source: string
): MutationResult<TData, TVariables> => {
  const options = config.options ?? {};
  const meta = inferLegacyFactoryMeta({
    key: options.mutationKey,
    operation,
    source,
    kind: 'mutation',
  });

  if (isTanstackFactoryV2Enabled(meta.domain)) {
    return createMutationV2<TData, TVariables, TContext>({
      mutationFn: config.mutationFn,
      ...options,
      meta,
    });
  }

  return useMutation({
    ...options,
    mutationFn: config.mutationFn,
  });
};

/**
 * Factory for creating standardized mutations.
 */
export function createMutation<TData, TVariables, TContext = unknown>(
  config: MutationFactoryConfig<TData, TVariables, TContext>
): MutationResult<TData, TVariables> {
  return createMutationWithOperation(config, 'action', 'legacy.query-factories.mutation');
}

export function createCreateMutation<TData, TVariables, TContext = unknown>(
  config: MutationFactoryConfig<TData, TVariables, TContext>
): MutationResult<TData, TVariables> {
  return createMutationWithOperation(config, 'create', 'legacy.query-factories.create');
}

export function createUpdateMutation<TData, TVariables, TContext = unknown>(
  config: MutationFactoryConfig<TData, TVariables, TContext>
): MutationResult<TData, TVariables> {
  return createMutationWithOperation(config, 'update', 'legacy.query-factories.update');
}

export function createDeleteMutation<TData, TVariables, TContext = unknown>(
  config: MutationFactoryConfig<TData, TVariables, TContext>
): MutationResult<TData, TVariables> {
  return createMutationWithOperation(config, 'delete', 'legacy.query-factories.delete');
}
