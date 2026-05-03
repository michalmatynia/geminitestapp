'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQueries,
  type InfiniteData,
  type QueryFunctionContext,
  type QueryKey,
  type UseSuspenseQueryOptions,
  type UseInfiniteQueryResult,
  type UseSuspenseInfiniteQueryResult,
  type UseSuspenseQueryResult,
  type QueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import {
  attachTanstackFactoryMeta,
  resolveTanstackFactoryMeta,
  telemetryErrorStage,
} from '@/shared/lib/observability/tanstack-telemetry';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';


import {
  ensureQueryDataV2 as ensureQueryDataLogic,
  prefetchQueryV2 as prefetchQueryLogic,
  fetchQueryV2 as fetchQueryLogic,
} from './tanstack-factory-v2/executors';
import {
  applyInfiniteQueryRuntimeGuards,
  applySuspenseInfiniteQueryRuntimeGuards,
  guardRefetchInterval,
  isRefetchEnabledForQuery,
  sanitizeRefetchIntervalValue,
} from './tanstack-factory-v2/guards';
import {
  useTelemetrizedQueryFn,
  useTelemetrizedMultiQueryOptionsV2,
  useTelemetrizedSuspenseMultiQueryOptionsV2,
  useQueryFactoryV2,
  useSuspenseQueryFactoryV2,
} from './tanstack-factory-v2/hooks';
import { emitFactoryTelemetry, withMutationKeyMeta } from './tanstack-factory-v2/telemetry';
import {
  type BaseQueryFactoryV2Config,
  type QueryDescriptorV2,
  type SuspenseQueryDescriptorV2,
  type InfiniteQueryFactoryV2Config,
  type SuspenseInfiniteQueryFactoryV2Config,
  type MutationFactoryV2Config,
  type OptimisticMutationFactoryV2Config,
  type EnsureQueryDataV2Config,
  type SingleQueryConfigV2,
  type PaginatedResult,
  type MultiQueryResultsV2,
  type SuspenseMultiQueryResultsV2,
  type MultiQueryConfigV2,
  type SuspenseMultiQueryConfigV2,
  type SaveMutationFactoryV2Config,
  type QueryOptionsWithoutCore,
} from './tanstack-factory-v2/types';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


export type {
  BaseQueryFactoryV2Config,
  QueryDescriptorV2,
  SuspenseQueryDescriptorV2,
  InfiniteQueryFactoryV2Config,
  SuspenseInfiniteQueryFactoryV2Config,
  MutationFactoryV2Config,
  OptimisticMutationFactoryV2Config,
  EnsureQueryDataV2Config,
  SingleQueryConfigV2,
  PaginatedResult,
  MultiQueryResultsV2,
  SuspenseMultiQueryResultsV2,
  MultiQueryConfigV2,
  SuspenseMultiQueryConfigV2,
  SaveMutationFactoryV2Config,
};

export function useListQueryV2<TData, TQueryFnData = TData[]>(
  config: BaseQueryFactoryV2Config<TQueryFnData, Error, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useQueryFactoryV2<TQueryFnData, Error, TQueryFnData>(config) as ListQuery<
    TData,
    TQueryFnData
  >;
}

export function createListQueryV2<TData, TQueryFnData = TData[]>(
  config: BaseQueryFactoryV2Config<TQueryFnData, Error, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useListQueryV2<TData, TQueryFnData>(config);
}

type SingleQueryEnabledPredicate = (query: unknown) => boolean;

type TelemetrizedMultiQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>;
  meta: ReturnType<typeof attachTanstackFactoryMeta>;
};

type TelemetrizedSuspenseMultiQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn' | 'meta'> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>;
  meta: ReturnType<typeof attachTanstackFactoryMeta>;
};

type MultiQueryOptionTuple<
  TQueries extends readonly QueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
> = {
  [K in keyof TQueries]: TQueries[K] extends QueryDescriptorV2<
    infer TQueryFnData,
    infer TError,
    infer TData,
    infer TQueryKey
  >
    ? TelemetrizedMultiQueryOptions<TQueryFnData, TError, TData, TQueryKey>
    : never;
};

type SuspenseMultiQueryOptionTuple<
  TQueries extends readonly SuspenseQueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
> = {
  [K in keyof TQueries]: TQueries[K] extends SuspenseQueryDescriptorV2<
    infer TQueryFnData,
    infer TError,
    infer TData,
    infer TQueryKey
  >
    ? TelemetrizedSuspenseMultiQueryOptions<TQueryFnData, TError, TData, TQueryKey>
    : never;
};

const keepPreviousPlaceholderData = <TData,>(previous: TData | undefined): TData | undefined =>
  previous;

const combineEnabledWithRequiredId = <TData, TTransformedData, TQueryKey extends QueryKey>(
  enabled: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'],
  hasId: boolean
): SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'] => {
  if (!hasId) return false;
  if (enabled === undefined) return true;
  if (typeof enabled === 'function') {
    const enabledPredicate = enabled as SingleQueryEnabledPredicate;
    return (query: unknown): boolean =>
      Boolean(enabledPredicate(query)) && hasId;
  }
  return Boolean(enabled);
};

export function useSingleQueryV2<
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

export function createSingleQueryV2<
  TData,
  TTransformedData = TData,
  TQueryKey extends QueryKey = QueryKey,
>(config: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>): SingleQuery<TTransformedData> {
  return useSingleQueryV2(config);
}

export function createPaginatedListQueryV2<TItem, TQueryKey extends QueryKey = QueryKey>(
  config: SingleQueryConfigV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>
): SingleQuery<PaginatedResult<TItem>> {
  const { placeholderData, meta, ...rest } = config;

  return createSingleQueryV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>({
    ...rest,
    meta,
    placeholderData:
      placeholderData ?? keepPreviousPlaceholderData<PaginatedResult<TItem>>,
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
      queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => queryFn(context),
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

export function createMultiQueryV2<
  TQueries extends readonly QueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = MultiQueryResultsV2<TQueries>,
>(config: MultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = Array.from(queries, (queryConfig) =>
    useTelemetrizedMultiQueryOptionsV2(queryConfig)
  ) as MultiQueryOptionTuple<TQueries>;

  if (combine) {
    return useQueries({
      queries: queryOptions,
      combine: (results): TCombine => combine(results as MultiQueryResultsV2<TQueries>),
    });
  }

  return useQueries({
    queries: queryOptions,
  });
}

export function createSuspenseQueryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SuspenseQueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): UseSuspenseQueryResult<TData, TError> {
  return useSuspenseQueryFactoryV2(config);
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
  const guardedOptions = applySuspenseInfiniteQueryRuntimeGuards(options);

  const telemetrizedQueryFn = useTelemetrizedQueryFn<TQueryFnData, TError, TQueryKey, TPageParam>(
    {
      meta,
      queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => queryFn(context),
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

export function createSuspenseMultiQueryV2<
  TQueries extends readonly SuspenseQueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = SuspenseMultiQueryResultsV2<TQueries>,
>(config: SuspenseMultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = Array.from(queries, (queryConfig) =>
    useTelemetrizedSuspenseMultiQueryOptionsV2(queryConfig)
  ) as SuspenseMultiQueryOptionTuple<TQueries>;

  if (combine) {
    return useSuspenseQueries({
      queries: queryOptions,
      combine: (results): TCombine =>
        combine(results as SuspenseMultiQueryResultsV2<TQueries>),
    });
  }

  return useSuspenseQueries({
    queries: queryOptions,
  });
}

export function createSaveMutationV2<
  TData,
  TVariables extends { id?: string | null },
  TContext = unknown,
  TError = Error,
>(
  config: SaveMutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  const { createFn, updateFn, ...rest } = config;

  return useMutationV2<TData, TVariables, TContext, TError>({
    ...rest,
    mutationFn: (variables: TVariables) => {
      if (variables.id) {
        return updateFn(variables.id, variables);
      }
      return createFn(variables);
    },
  });
}

export function useMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
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
        await onSuccess(data, variables, context, mutationContext);
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
        if (!mutationFn) {
          throw new Error('Mutation function is required');
        }
        const data = await mutationFn(variables, { queryClient });
        emitFactoryTelemetry({
          entity: 'mutation',
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
        logClientCatch(error, {
          source: 'query-factories-v2',
          action: 'mutationFn',
          attempt,
        });
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

export function createMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}

export function createOptimisticMutationV2<TData, TVariables, TCacheData = TData>(
  config: OptimisticMutationFactoryV2Config<TData, TVariables, TCacheData>
): MutationResult<TData, TVariables> {
  const { queryKey, updateFn, revertOnError, onMutate, onError, onSettled, meta, ...rest } = config;
  const queryClient = useQueryClient();

  return useMutationV2<TData, TVariables, { previousData: TCacheData | undefined }>({
    ...rest,
    meta,
    onMutate: async (variables, context) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TCacheData>(queryKey);

      queryClient.setQueryData<TCacheData>(queryKey, (old) => updateFn(old, variables));

      const customContext = onMutate ? await onMutate(variables, context) : undefined;
      return { ...customContext, previousData };
    },
    onError: (err, variables, context, mutationContext) => {
      if (revertOnError !== false && context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      if (onError) {
        return onError(err, variables, context, mutationContext);
      }
      return undefined;
    },
    onSettled: (data, error, variables, context, mutationContext) => {
      void queryClient.invalidateQueries({ queryKey });
      if (onSettled) {
        return onSettled(data, error, variables, context, mutationContext);
      }
      return undefined;
    },
  });
}

export function useEnsureQueryDataV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<TData> {
  const queryClient = useQueryClient();
  return ensureQueryDataV2(queryClient, config);
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

export function ensureQueryDataV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>
): () => Promise<TData> {
  return ensureQueryDataLogic(queryClient, config) as () => Promise<TData>;
}

export function prefetchQueryV2<
  TQueryFnData,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>
): () => Promise<void> {
  return prefetchQueryLogic(queryClient, config);
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
  return fetchQueryLogic(queryClient, config) as () => Promise<TData>;
}

export const queryFactoriesV2TestUtils = {
  guardRefetchInterval,
  isRefetchEnabledForQuery,
  sanitizeRefetchIntervalValue,
};

export function useCreateMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}

export function useUpdateMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}

export function useDeleteMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}

export function createCreateMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useCreateMutationV2<TData, TVariables, TContext, TError>(config);
}

export function createUpdateMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useUpdateMutationV2<TData, TVariables, TContext, TError>(config);
}

export function createDeleteMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useDeleteMutationV2<TData, TVariables, TContext, TError>(config);
}
