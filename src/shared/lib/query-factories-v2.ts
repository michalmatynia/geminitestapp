'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueries,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
  useSuspenseQueries,
  type InfiniteData,
  type QueriesResults,
  type QueryClient,
  type QueryFunctionContext,
  type QueryKey,
  type SuspenseQueriesResults,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
  type UseSuspenseInfiniteQueryOptions,
  type UseSuspenseInfiniteQueryResult,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import { useRef } from 'react';

import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';
import {
  attachTanstackFactoryMeta,
  emitTanstackTelemetry,
  telemetryErrorStage,
  resolveTanstackFactoryMeta,
} from '@/shared/lib/observability/tanstack-telemetry';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type {
  TanstackFactoryMeta,
  TanstackLifecycleStage,
} from '@/shared/lib/tanstack-factory-v2.types';

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;
const MIN_REFETCH_INTERVAL_MS = 1;

type QueryFactoryFn<TQueryFnData, TQueryKey extends QueryKey> =
  | (() => Promise<TQueryFnData>)
  | ((context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>);

type QueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
>;

type SuspenseQueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
>;

type InfiniteQueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn' | 'meta'
>;

type SuspenseInfiniteQueryOptionsWithoutCore<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseSuspenseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn' | 'meta'
>;

type BaseQueryFactoryV2Config<
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

type SuspenseQueryFactoryV2Config<
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

type InfiniteQueryFactoryV2Config<
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

type SuspenseInfiniteQueryFactoryV2Config<
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
  mutationFn: (variables: TVariables, context: { queryClient: QueryClient }) => Promise<TData>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
  transformError?: (error: unknown) => TError;
  /**
   * Declarative invalidation after successful mutation.
   */
  invalidateKeys?:
    | readonly QueryKey[]
    | ((
        data: TData,
        variables: TVariables,
        context: TContext | undefined
      ) => readonly QueryKey[]);
  /**
   * Custom invalidation logic after successful mutation.
   */
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

type SingleQueryConfigV2<
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

export type PaginatedResult<TItem> = {
  items: TItem[];
  total: number;
};

type MutableTuple<TItems extends readonly unknown[]> = [...TItems];

export type MultiQueryResultsV2<
  TQueries extends readonly QueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
> = QueriesResults<MutableTuple<TQueries>>;

export type SuspenseMultiQueryResultsV2<
  TQueries extends readonly SuspenseQueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
> = SuspenseQueriesResults<MutableTuple<TQueries>>;

type AnyRefetchIntervalOption = number | false | ((query: unknown) => number | false | undefined);

type QueryLikeWithEnabledOption = {
  options?: {
    enabled?: boolean | ((query: unknown) => boolean);
  };
};

type EmitFactoryTelemetryInput = {
  entity: 'query' | 'mutation' | 'query-batch';
  stage: TanstackLifecycleStage;
  meta: TanstackFactoryMeta;
  key: QueryKey | undefined;
  attempt: number;
  context?: Record<string, unknown> | undefined;
  startedAtMs?: number | undefined;
  error?: unknown;
};

const sanitizeRefetchIntervalValue = (
  value: number | false | undefined
): number | false | undefined => {
  if (value === false || value === undefined) return value;
  if (!Number.isFinite(value) || value < MIN_REFETCH_INTERVAL_MS) return false;
  return value;
};

const isRefetchEnabledForQuery = (query: unknown): boolean => {
  if (!query || typeof query !== 'object') return true;

  const enabled = (query as QueryLikeWithEnabledOption).options?.enabled;
  if (enabled === undefined) return true;

  if (typeof enabled === 'function') {
    try {
      return Boolean(enabled(query));
    } catch {
      return false;
    }
  }

  return enabled !== false;
};

const guardRefetchInterval = <TOption extends AnyRefetchIntervalOption | undefined>(
  option: TOption
): TOption => {
  if (option === undefined) return option;

  if (typeof option === 'function') {
    const wrapped = ((query: unknown): number | false | undefined => {
      if (!isRefetchEnabledForQuery(query)) return false;

      let nextValue: number | false | undefined;
      try {
        nextValue = option(query);
      } catch {
        return false;
      }

      return sanitizeRefetchIntervalValue(nextValue);
    }) as TOption;
    return wrapped;
  }

  return sanitizeRefetchIntervalValue(option) as TOption;
};

const applyQueryRuntimeGuards = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  options: QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey>
): QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> => {
  const { refetchInterval, ...rest } = options;
  const guardedRefetchInterval = guardRefetchInterval(
    refetchInterval as unknown as AnyRefetchIntervalOption | undefined
  ) as QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey>['refetchInterval'];
  const isStaticallyDisabled = options['enabled'] === false;

  const base = {
    ...rest,
    staleTime: options['staleTime'] ?? DEFAULT_STALE_TIME_MS,
    refetchOnMount: options['refetchOnMount'] ?? false,
    refetchOnWindowFocus: options['refetchOnWindowFocus'] ?? false,
    refetchOnReconnect: options['refetchOnReconnect'] ?? false,
    refetchIntervalInBackground: options['refetchIntervalInBackground'] ?? false,
  };

  if (isStaticallyDisabled) {
    return {
      ...base,
      refetchInterval: false,
    };
  }

  if (guardedRefetchInterval !== undefined) {
    return {
      ...base,
      refetchInterval: guardedRefetchInterval,
    };
  }

  return base;
};

const applyInfiniteQueryRuntimeGuards = <
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
>(
    options: InfiniteQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey, TPageParam>
  ): InfiniteQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey, TPageParam> => {
  const { refetchInterval, ...rest } = options;
  const guardedRefetchInterval = guardRefetchInterval(
    refetchInterval as unknown as AnyRefetchIntervalOption | undefined
  ) as InfiniteQueryOptionsWithoutCore<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >['refetchInterval'];
  const isStaticallyDisabled = options['enabled'] === false;

  const base = {
    ...rest,
    staleTime: options['staleTime'] ?? DEFAULT_STALE_TIME_MS,
    refetchOnMount: options['refetchOnMount'] ?? false,
    refetchOnWindowFocus: options['refetchOnWindowFocus'] ?? false,
    refetchOnReconnect: options['refetchOnReconnect'] ?? false,
    refetchIntervalInBackground: options['refetchIntervalInBackground'] ?? false,
  };

  if (isStaticallyDisabled) {
    return {
      ...base,
      refetchInterval: false,
    };
  }

  if (guardedRefetchInterval !== undefined) {
    return {
      ...base,
      refetchInterval: guardedRefetchInterval,
    };
  }

  return base;
};

const emitFactoryTelemetry = ({
  entity,
  stage,
  meta,
  key,
  attempt,
  context,
  startedAtMs,
  error,
}: EmitFactoryTelemetryInput): void => {
  emitTanstackTelemetry({
    entity,
    stage,
    meta,
    key,
    attempt,
    ...(typeof startedAtMs === 'number' ? { durationMs: Date.now() - startedAtMs } : {}),
    ...(error !== undefined ? { error } : {}),
    context,
  });
};

const withQueryKeyMeta = <TQueryKey extends QueryKey>(
  meta: TanstackFactoryMeta,
  queryKey: TQueryKey
): TanstackFactoryMeta => ({
    ...meta,
    queryKey,
  });

const withMutationKeyMeta = (
  meta: TanstackFactoryMeta,
  mutationKey: QueryKey | undefined
): TanstackFactoryMeta => ({
  ...meta,
  ...(mutationKey ? { mutationKey } : {}),
});

const invokeQueryFactoryFn = <TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>,
  context: QueryFunctionContext<TQueryKey>
): Promise<TQueryFnData> =>
    (queryFn as (ctx: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>)(context);

const combineEnabledWithRequiredId = <TData, TTransformedData, TQueryKey extends QueryKey>(
  enabled: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'],
  hasId: boolean
): SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'] => {
  if (!hasId) return false;
  if (enabled === undefined) return true;
  if (typeof enabled === 'function') {
    return ((query): boolean => enabled(query) && hasId) as SingleQueryConfigV2<
      TData,
      TTransformedData,
      TQueryKey
    >['enabled'];
  }
  return Boolean(enabled);
};

function useTelemetrizedQueryFn<TQueryFnData, TError, TQueryKey extends QueryKey, TPageParam = never>(
  config: {
    meta: TanstackFactoryMeta;
    queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
    telemetryContext?: Record<string, unknown> | undefined;
    transformError?: (error: unknown) => TError;
    entity?: 'query' | 'query-batch';
  },
  normalizedQueryKey: TQueryKey
): (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData> {
  const { meta, queryFn, telemetryContext, transformError, entity = 'query' } = config;
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);
  const attemptRef = useRef(0);

  return async (context: QueryFunctionContext<TQueryKey, TPageParam>): Promise<TQueryFnData> => {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    if (attempt > 1) {
      emitFactoryTelemetry({
        entity,
        stage: 'retry',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });
    }

    const startMs = Date.now();
    emitFactoryTelemetry({
      entity,
      stage: 'start',
      meta: telemetryMeta,
      key: normalizedQueryKey,
      attempt,
      ...(telemetryContext ? { context: telemetryContext } : {}),
    });

    try {
      const data = await queryFn(context);
      emitFactoryTelemetry({
        entity,
        stage: 'success',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt,
        ...(telemetryContext ? { context: telemetryContext } : {}),
        startedAtMs: startMs,
      });
      attemptRef.current = 0;
      return data;
    } catch (error) {
      const finalError = transformError ? transformError(error) : (error as TError);
      emitFactoryTelemetry({
        entity,
        stage: telemetryErrorStage(error),
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt,
        startedAtMs: startMs,
        error,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });
      throw finalError;
    }
  };
}

function useTelemetrizedMultiQueryOptionsV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: QueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>;
  meta: ReturnType<typeof attachTanstackFactoryMeta>;
} {
  const { queryKey, queryFn, meta, telemetryContext, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyQueryRuntimeGuards(options);
  const telemetrizedQueryFn = useTelemetrizedQueryFn(
    {
      meta,
      queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
      telemetryContext,
      transformError,
      entity: 'query-batch',
    },
    normalizedQueryKey
  );

  return {
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  };
}

function useTelemetrizedSuspenseMultiQueryOptionsV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SuspenseQueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>;
  meta: ReturnType<typeof attachTanstackFactoryMeta>;
} {
  const { queryKey, queryFn, meta, telemetryContext, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyQueryRuntimeGuards(options as any);
  const telemetrizedQueryFn = useTelemetrizedQueryFn(
    {
      meta,
      queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
      telemetryContext,
      transformError,
      entity: 'query-batch',
    },
    normalizedQueryKey
  );

  return {
    ...(guardedOptions as any),
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  };
}

function useQueryFactoryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: BaseQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const { meta, queryFn, telemetryContext, queryKey, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyQueryRuntimeGuards(options);

  const telemetrizedQueryFn = useTelemetrizedQueryFn(
    {
      meta,
      queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
      telemetryContext,
      transformError,
    },
    normalizedQueryKey
  );

  return useQuery({
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  });
}

export function createListQueryV2<TData, TQueryFnData = TData[]>(
  config: BaseQueryFactoryV2Config<TQueryFnData, Error, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useQueryFactoryV2<TQueryFnData, Error, TQueryFnData>(config) as ListQuery<
    TData,
    TQueryFnData
  >;
}

export function createSingleQueryV2<
  TData,
  TTransformedData = TData,
  TQueryKey extends QueryKey = QueryKey,
>(config: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>): SingleQuery<TTransformedData> {
  const { queryKey, id, enabled, ...rest } = config;
  const resolvedQueryKey = typeof queryKey === 'function' ? queryKey(id ?? 'none') : queryKey;
  const hasId = id !== null && id !== undefined;
  const guardedEnabled = combineEnabledWithRequiredId(enabled, hasId);

  return useQueryFactoryV2<TData, Error, TTransformedData, TQueryKey>({
    ...rest,
    queryKey: resolvedQueryKey,
    ...(guardedEnabled !== undefined ? { enabled: guardedEnabled } : {}),
  }) as SingleQuery<TTransformedData>;
}

export function createPaginatedListQueryV2<
  TItem,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SingleQueryConfigV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>
): SingleQuery<PaginatedResult<TItem>> {
  const { placeholderData, meta, ...rest } = config;

  return createSingleQueryV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>({
    ...rest,
    meta,
    placeholderData: placeholderData ?? ((previous) => previous),
  });
}

export function createInfiniteQueryV2<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  config: InfiniteQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey, TPageParam>
): UseInfiniteQueryResult<TData, TError> {
  const { queryKey, queryFn, meta, telemetryContext, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyInfiniteQueryRuntimeGuards(options);

  const telemetrizedQueryFn = useTelemetrizedQueryFn<TQueryFnData, TError, TQueryKey, TPageParam>(
    {
      meta,
      queryFn: (context) => queryFn(context),
      telemetryContext,
      transformError,
    },
    normalizedQueryKey
  );

  return useInfiniteQuery({
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  });
}

export type MultiQueryConfigV2<
  TQueries extends readonly QueryDescriptorV2<
    unknown,
    unknown,
    unknown,
    QueryKey
  >[] = readonly QueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = MultiQueryResultsV2<TQueries>,
> = {
  queries: [...TQueries];
  combine?: (results: MultiQueryResultsV2<TQueries>) => TCombine;
};

export function createMultiQueryV2<
  TQueries extends readonly QueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = MultiQueryResultsV2<TQueries>,
>(config: MultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = queries.map((queryConfig) =>
    useTelemetrizedMultiQueryOptionsV2(queryConfig)
  );

  return useQueries({
    queries: queryOptions as any,
    ...(combine
      ? {
        combine: (results: any): TCombine =>
          combine(results as MultiQueryResultsV2<TQueries>),
      }
      : {}),
  });
}

export function createSuspenseQueryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SuspenseQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey>
): UseSuspenseQueryResult<TData, TError> {
  const { meta, queryFn, telemetryContext, queryKey, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyQueryRuntimeGuards(options);

  const telemetrizedQueryFn = useTelemetrizedQueryFn(
    {
      meta,
      queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
      telemetryContext,
      transformError,
    },
    normalizedQueryKey
  );

  return useSuspenseQuery({
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  });
}

export function createSuspenseInfiniteQueryV2<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  config: SuspenseInfiniteQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey, TPageParam>
): UseSuspenseInfiniteQueryResult<TData, TError> {
  const { queryKey, queryFn, meta, telemetryContext, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyInfiniteQueryRuntimeGuards(options);

  const telemetrizedQueryFn = useTelemetrizedQueryFn<TQueryFnData, TError, TQueryKey, TPageParam>(
    {
      meta,
      queryFn: (context) => queryFn(context),
      telemetryContext,
      transformError,
    },
    normalizedQueryKey
  );

  return useSuspenseInfiniteQuery({
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  });
}

export type SuspenseMultiQueryConfigV2<
  TQueries extends readonly SuspenseQueryDescriptorV2<
    unknown,
    unknown,
    unknown,
    QueryKey
  >[] = readonly SuspenseQueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = SuspenseMultiQueryResultsV2<TQueries>,
> = {
  queries: [...TQueries];
  combine?: (results: SuspenseMultiQueryResultsV2<TQueries>) => TCombine;
};

export function createSuspenseMultiQueryV2<
  TQueries extends readonly SuspenseQueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = SuspenseMultiQueryResultsV2<TQueries>,
>(config: SuspenseMultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = queries.map((queryConfig) =>
    useTelemetrizedSuspenseMultiQueryOptionsV2(queryConfig)
  );

  return useSuspenseQueries({
    queries: queryOptions as any,
    ...(combine
      ? {
        combine: (results: any): TCombine =>
          combine(results as SuspenseMultiQueryResultsV2<TQueries>),
      }
      : {}),
  });
}

export type SaveMutationFactoryV2Config<
  TData,
  TVariables extends { id?: string | null },
  TError = Error,
  TContext = unknown,
> = Omit<MutationFactoryV2Config<TData, TVariables, TError, TContext>, 'mutationFn'> & {
  createFn: (variables: TVariables) => Promise<TData>;
  updateFn: (id: string, variables: TVariables) => Promise<TData>;
};

export function createSaveMutationV2<
  TData,
  TVariables extends { id?: string | null },
  TContext = unknown,
  TError = Error,
>(config: SaveMutationFactoryV2Config<TData, TVariables, TError, TContext>): MutationResult<TData, TVariables, TError> {
  const { createFn, updateFn, ...rest } = config;

  return createMutationV2<TData, TVariables, TContext, TError>({
    ...rest,
    mutationFn: (variables: TVariables) => {
      if (variables.id) {
        return updateFn(variables.id, variables);
      }
      return createFn(variables);
    },
  });
}

export function createMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  const {
    mutationFn,
    meta,
    mutationKey,
    telemetryContext,
    transformError,
    invalidateKeys,
    invalidate,
    onSuccess,
    ...options
  } = config;
  const normalizedMutationKey = mutationKey ? normalizeQueryKey(mutationKey) : undefined;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedMutationKey });
  const telemetryMeta = withMutationKeyMeta(meta, normalizedMutationKey);
  const attemptRef = useRef(0);
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    ...(normalizedMutationKey ? { mutationKey: normalizedMutationKey } : {}),
    meta: attachTanstackFactoryMeta(resolvedMeta),
    onSuccess: async (data, variables, context, mutationContext) => {
      if (invalidateKeys) {
        const keys =
          typeof invalidateKeys === 'function'
            ? invalidateKeys(data, variables, context)
            : invalidateKeys;
        await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
      }

      if (invalidate) {
        await invalidate(queryClient, data, variables, context);
      }

      if (onSuccess) {
        await (onSuccess as any)(data, variables, context, mutationContext);
      }
    },
    mutationFn: async (variables: TVariables): Promise<TData> => {
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      if (attempt > 1) {
        emitFactoryTelemetry({
          entity: 'mutation',
          stage: 'retry',
          meta: telemetryMeta,
          key: normalizedMutationKey,
          attempt,
          ...(telemetryContext ? { context: telemetryContext } : {}),
        });
      }

      const startMs = Date.now();
      emitFactoryTelemetry({
        entity: 'mutation',
        stage: 'start',
        meta: telemetryMeta,
        key: normalizedMutationKey,
        attempt,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });

      try {
        const data = await mutationFn(variables, { queryClient });
        emitFactoryTelemetry({          entity: 'mutation',
          stage: 'success',
          meta: telemetryMeta,
          key: normalizedMutationKey,
          attempt,
          ...(telemetryContext ? { context: telemetryContext } : {}),
          startedAtMs: startMs,
        });
        attemptRef.current = 0;
        return data;
      } catch (error) {
        const finalError = transformError ? transformError(error) : (error as Error);
        emitFactoryTelemetry({
          entity: 'mutation',
          stage: telemetryErrorStage(error),
          meta: telemetryMeta,
          key: normalizedMutationKey,
          attempt,
          startedAtMs: startMs,
          error,
          ...(telemetryContext ? { context: telemetryContext } : {}),
        });
        throw finalError;
      }
    },
  });
}

export function createOptimisticMutationV2<TData, TVariables, TCacheData = TData>(
  config: OptimisticMutationFactoryV2Config<TData, TVariables, TCacheData>
): MutationResult<TData, TVariables> {
  const { queryKey, updateFn, revertOnError, onMutate, onError, onSettled, meta, ...rest } = config;
  const queryClient = useQueryClient();

  return createMutationV2<TData, TVariables, { previousData: TCacheData | undefined }>({
    ...rest,
    meta,
    onMutate: async (variables, context) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TCacheData>(queryKey);

      queryClient.setQueryData<TCacheData>(queryKey, (old) => updateFn(old, variables));

      const customContext = onMutate ? await (onMutate as any)(variables, context) : {};
      return { ...customContext, previousData };
    },
    onError: (err, variables, context, mutationContext) => {
      if (revertOnError !== false && context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      if (onError) {
        return (onError as any)(err, variables, context, mutationContext);
      }
    },
    onSettled: (data, error, variables, context, mutationContext) => {
      void queryClient.invalidateQueries({ queryKey });
      if (onSettled) {
        return (onSettled as any)(data, error, variables, context, mutationContext);
      }
    },
  });
}

export function useEnsureQueryDataV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<TData> {
  const { queryKey, queryFn, meta, telemetryContext, transformError, staleTime } = config;
  const queryClient = useQueryClient();
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);

  return async (): Promise<TData> => {
    const startMs = Date.now();
    emitFactoryTelemetry({
      entity: 'query',
      stage: 'start',
      meta: telemetryMeta,
      key: normalizedQueryKey,
      attempt: 1,
      ...(telemetryContext ? { context: telemetryContext } : {}),
    });

    try {
      const data = await queryClient.ensureQueryData({
        queryKey: normalizedQueryKey,
        queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
        staleTime,
      });

      emitFactoryTelemetry({
        entity: 'query',
        stage: 'success',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt: 1,
        ...(telemetryContext ? { context: telemetryContext } : {}),
        startedAtMs: startMs,
      });

      return data as TData;
    } catch (error) {
      const finalError = transformError ? transformError(error) : (error as TError);
      emitFactoryTelemetry({
        entity: 'query',
        stage: telemetryErrorStage(error),
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt: 1,
        startedAtMs: startMs,
        error,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });
      throw finalError;
    }
  };
}

export function usePrefetchQueryV2<
  TQueryFnData,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<void> {
  const queryClient = useQueryClient();
  return prefetchQueryV2(queryClient, config);
}

export function useFetchQueryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<TData> {
  const queryClient = useQueryClient();
  return fetchQueryV2(queryClient, config);
}

export function prefetchQueryV2<
  TQueryFnData,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>
): () => Promise<void> {
  const { queryKey, queryFn, meta, telemetryContext, staleTime } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);

  return async (): Promise<void> => {
    const startMs = Date.now();
    emitFactoryTelemetry({
      entity: 'query',
      stage: 'start',
      meta: telemetryMeta,
      key: normalizedQueryKey,
      attempt: 1,
      ...(telemetryContext ? { context: telemetryContext } : {}),
    });

    try {
      await queryClient.prefetchQuery({
        queryKey: normalizedQueryKey,
        queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
        staleTime,
      });

      emitFactoryTelemetry({
        entity: 'query',
        stage: 'success',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt: 1,
        ...(telemetryContext ? { context: telemetryContext } : {}),
        startedAtMs: startMs,
      });
    } catch (error) {
      emitFactoryTelemetry({
        entity: 'query',
        stage: telemetryErrorStage(error),
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt: 1,
        startedAtMs: startMs,
        error,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });
    }
  };
}

export function fetchQueryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>
): () => Promise<TData> {
  const { queryKey, queryFn, meta, telemetryContext, transformError, staleTime } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);

  return async (): Promise<TData> => {
    const startMs = Date.now();
    emitFactoryTelemetry({
      entity: 'query',
      stage: 'start',
      meta: telemetryMeta,
      key: normalizedQueryKey,
      attempt: 1,
      ...(telemetryContext ? { context: telemetryContext } : {}),
    });

    try {
      const data = await queryClient.fetchQuery({
        queryKey: normalizedQueryKey,
        queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
        staleTime,
      });

      emitFactoryTelemetry({
        entity: 'query',
        stage: 'success',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt: 1,
        ...(telemetryContext ? { context: telemetryContext } : {}),
        startedAtMs: startMs,
      });

      return data as TData;
    } catch (error) {
      const finalError = transformError ? transformError(error) : (error as TError);
      emitFactoryTelemetry({
        entity: 'query',
        stage: telemetryErrorStage(error),
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt: 1,
        startedAtMs: startMs,
        error,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });
      throw finalError;
    }
  };
}

export const queryFactoriesV2TestUtils = {
  guardRefetchInterval,
  isRefetchEnabledForQuery,
  sanitizeRefetchIntervalValue,
};

export const createCreateMutationV2 = createMutationV2;
export const createUpdateMutationV2 = createMutationV2;
export const createDeleteMutationV2 = createMutationV2;
