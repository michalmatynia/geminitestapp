'use client';

import {
  type InfiniteData,
  type QueryFunctionContext,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseSuspenseInfiniteQueryOptions,
  type UseSuspenseQueryOptions,
  type QueryClient,
  type UseQueryResult,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';

import { 
  TanstackFactoryMeta, 
} from '../tanstack-factory-v2.types';

export type QueryFactoryFn<TQueryFnData, TQueryKey extends QueryKey> =
  | (() => Promise<TQueryFnData>)
  | ((context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>);

export type QueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
>;

export type SuspenseQueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
>;

export type InfiniteQueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn' | 'meta'
>;

export type SuspenseInfiniteQueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseSuspenseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn' | 'meta'
>;

export type BaseQueryFactoryV2Config<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> & {
  queryKey: TQueryKey;
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
};

export type QueryDescriptorV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = BaseQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey>;

export type SuspenseQueryFactoryV2Config<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = SuspenseQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> & {
  queryKey: TQueryKey;
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
};

export type SuspenseQueryDescriptorV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = SuspenseQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey>;

export type InfiniteQueryFactoryV2Config<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = InfiniteQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
};

export type SuspenseInfiniteQueryFactoryV2Config<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = SuspenseInfiniteQueryOptionsWithoutCore<
  TQueryFnData,
  TError,
  TData,
  TQueryKey,
  TPageParam
> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
};

export type MutationFactoryV2Config<TData, TVariables, TError = Error, TContext = unknown> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn' | 'meta'
> & {
  mutationFn?: (variables: TVariables, context: { queryClient: QueryClient }) => Promise<TData>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
  invalidateKeys?:
    | readonly QueryKey[]
    | ((
        data: TData,
        variables: TVariables,
        context: TContext | undefined
      ) => readonly QueryKey[]);
  invalidate?: (
    queryClient: QueryClient,
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => Promise<void> | void;
};

export type OptimisticMutationFactoryV2Config<
  TData,
  TVariables,
  TCacheData,
  TError = Error,
> = MutationFactoryV2Config<TData, TVariables, TError, { previousData: TCacheData | undefined }> & {
  queryKey: QueryKey;
  updateFn: (oldData: TCacheData | undefined, variables: TVariables) => TCacheData;
  revertOnError?: boolean;
};

export type EnsureQueryDataV2Config<
  TQueryFnData,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
> = {
  queryKey: TQueryKey;
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
  staleTime?: number;
};

export type SingleQueryConfigV2<
  TData,
  TTransformedData = TData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TData, Error, TTransformedData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
> & {
  queryKey: TQueryKey | ((id: string) => TQueryKey);
  queryFn: QueryFactoryFn<TData, TQueryKey>;
  id?: string | null | undefined;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => Error;
};

export type MultiQueryConfigV2<
  TQueries extends readonly unknown[],
  TCombine = MultiQueryResultsV2<TQueries>,
> = {
  queries: {
    [K in keyof TQueries]: TQueries[K] extends QueryDescriptorV2<infer TQueryFnData, infer TError, infer TData, infer TQueryKey>
      ? QueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
      : never;
  };
  combine?: (results: MultiQueryResultsV2<TQueries>) => TCombine;
};

export type MultiQueryResultsV2<TQueries extends readonly unknown[]> = {
  [K in keyof TQueries]: TQueries[K] extends QueryDescriptorV2<
    unknown,
    infer TError,
    infer TData,
    QueryKey
  >
    ? UseQueryResult<TData, TError>
    : never;
};

export type SuspenseMultiQueryConfigV2<
  TQueries extends readonly unknown[],
  TCombine = SuspenseMultiQueryResultsV2<TQueries>,
> = {
  queries: {
    [K in keyof TQueries]: TQueries[K] extends SuspenseQueryDescriptorV2<infer TQueryFnData, infer TError, infer TData, infer TQueryKey>
      ? SuspenseQueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
      : never;
  };
  combine?: (results: SuspenseMultiQueryResultsV2<TQueries>) => TCombine;
};

export type SuspenseMultiQueryResultsV2<TQueries extends readonly unknown[]> = {
  [K in keyof TQueries]: TQueries[K] extends SuspenseQueryDescriptorV2<
    unknown,
    infer TError,
    infer TData,
    QueryKey
  >
    ? UseSuspenseQueryResult<TData, TError>
    : never;
};

export type SaveMutationFactoryV2Config<TData, TVariables, TError = Error, TContext = unknown> = 
  Omit<MutationFactoryV2Config<TData, TVariables, TError, TContext>, 'mutationFn'> & {
    createFn: (variables: TVariables) => Promise<TData>;
    updateFn: (id: string, variables: TVariables) => Promise<TData>;
  };

export type PaginatedResult<TItem> = {
  items: TItem[];
  total: number;
};

export type ManualQueryExecutorInput<TQueryFnData, TQueryKey extends QueryKey> = {
  queryClient: QueryClient;
  normalizedQueryKey: TQueryKey;
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>;
  staleTime?: number;
};
