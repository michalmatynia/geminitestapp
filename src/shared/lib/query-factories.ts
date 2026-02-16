'use client';

import {
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

  return createListQueryV2({
    queryKey,
    queryFn,
    ...mergedOptions,
    meta,
  });
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

  return createSingleQueryV2({
    id,
    queryKey: resolvedKey,
    queryFn,
    ...mergedOptions,
    enabled,
    meta,
  });
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

  return createMutationV2<TData, TVariables, TContext>({
    mutationFn: config.mutationFn,
    ...options,
    meta,
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
