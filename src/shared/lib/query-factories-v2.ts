'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQueries,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
  type UseSuspenseInfiniteQueryResult,
  type UseSuspenseQueryResult,
  type QueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';
import {
  attachTanstackFactoryMeta,
  resolveTanstackFactoryMeta,
  telemetryErrorStage,
} from '@/shared/lib/observability/tanstack-telemetry';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

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
} from './tanstack-factory-v2/types';

import {
  applyInfiniteQueryRuntimeGuards,
  guardRefetchInterval,
  isRefetchEnabledForQuery,
  sanitizeRefetchIntervalValue,
} from './tanstack-factory-v2/guards';

import { emitFactoryTelemetry, withMutationKeyMeta } from './tanstack-factory-v2/telemetry';

import {
  ensureQueryDataV2 as ensureQueryDataLogic,
  prefetchQueryV2 as prefetchQueryLogic,
  fetchQueryV2 as fetchQueryLogic,
} from './tanstack-factory-v2/executors';

import {
  useTelemetrizedQueryFn,
  useTelemetrizedMultiQueryOptionsV2,
  useTelemetrizedSuspenseMultiQueryOptionsV2,
  useQueryFactoryV2,
  useSuspenseQueryFactoryV2,
} from './tanstack-factory-v2/hooks';

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

export function createListQueryV2<TData, TQueryFnData = TData[]>(
  config: BaseQueryFactoryV2Config<TQueryFnData, Error, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useQueryFactoryV2<TQueryFnData, Error, TQueryFnData>(config) as ListQuery<
    TData,
    TQueryFnData
  >;
}

const combineEnabledWithRequiredId = <TData, TTransformedData, TQueryKey extends QueryKey>(
  enabled: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'],
  hasId: boolean
): SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'] => {
  if (!hasId) return false;
  if (enabled === undefined) return true;
  if (typeof enabled === 'function') {
    return ((query): boolean => (enabled as any)(query) && hasId) as SingleQueryConfigV2<
      TData,
      TTransformedData,
      TQueryKey
    >['enabled'];
  }
  return Boolean(enabled);
};

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

export function createPaginatedListQueryV2<TItem, TQueryKey extends QueryKey = QueryKey>(
  config: SingleQueryConfigV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>
): SingleQuery<PaginatedResult<TItem>> {
  const { placeholderData, meta, ...rest } = config;

  return createSingleQueryV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>({
    ...rest,
    meta,
    placeholderData: (placeholderData as any) ?? ((previous: any) => previous),
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
      queryFn: (context: any) => queryFn(context),
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
  TQueries extends readonly QueryDescriptorV2<any, any, any, any>[],
  TCombine = MultiQueryResultsV2<TQueries>,
>(config: MultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = (queries as unknown as any[]).map((queryConfig) =>
    useTelemetrizedMultiQueryOptionsV2(queryConfig)
  );

  return useQueries({
    queries: queryOptions as any,
    ...(combine
      ? {
        combine: (results: any): TCombine => combine(results as MultiQueryResultsV2<TQueries>),
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
  const guardedOptions = applyInfiniteQueryRuntimeGuards(options);

  const telemetrizedQueryFn = useTelemetrizedQueryFn<TQueryFnData, TError, TQueryKey, TPageParam>(
    {
      meta,
      queryFn: (context: any) => queryFn(context),
      telemetryContext,
      transformError,
    },
    normalizedQueryKey
  );

  return useSuspenseInfiniteQuery({
    ...(guardedOptions as any),
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  });
}

export function createSuspenseMultiQueryV2<
  TQueries extends readonly SuspenseQueryDescriptorV2<any, any, any, any>[],
  TCombine = SuspenseMultiQueryResultsV2<TQueries>,
>(config: SuspenseMultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = (queries as unknown as any[]).map((queryConfig) =>
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

export function createSaveMutationV2<
  TData,
  TVariables extends { id?: string | null },
  TContext = unknown,
  TError = Error,
>(
  config: SaveMutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
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

export const createCreateMutationV2 = createMutationV2;
export const createUpdateMutationV2 = createMutationV2;
export const createDeleteMutationV2 = createMutationV2;
