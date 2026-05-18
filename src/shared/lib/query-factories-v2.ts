'use client';

/* eslint-disable max-lines, max-lines-per-function, max-params, complexity, require-atomic-updates, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/only-throw-error */

/**
 * Query Factories V2
 *
 * Enhanced query factory utilities built on top of TanStack Query.
 * 
 * This module provides standardized, telemetrized patterns for:
 * - Data fetching with consistent error handling and observability.
 * - Mutation operations including optimistic UI updates.
 * - Infinite query patterns for robust pagination.
 * - Suspense-enabled queries for optimized React loading states.
 * 
 * These factories serve as the primary abstraction layer for API interactions
 * across the application, ensuring type safety, consistent query metadata,
 * and built-in telemetry for performance monitoring and debugging.
 */

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
  type UseMutationOptions,
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
  buildTelemetrizedQueryOptionsV2,
  buildTelemetrizedSuspenseQueryOptionsV2,
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
  type MultiQueryConfigV2,
  type SuspenseMultiQueryResultsV2,
  type SuspenseMultiQueryConfigV2,
  type SaveMutationFactoryV2Config,
  type QueryOptionsWithoutCore,
} from './tanstack-factory-v2/types';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

// Re-export type definitions for factory configuration and query descriptors.
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

/**
 * Hook for standard list queries.
 * 
 * @param config - Query configuration.
 * @returns A standardized ListQuery object.
 */
export function useListQueryV2<TData, TQueryFnData = TData[]>(
  config: BaseQueryFactoryV2Config<TQueryFnData, Error, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useQueryFactoryV2<TQueryFnData, Error, TQueryFnData>(config) as ListQuery<
    TData,
    TQueryFnData
  >;
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
> = Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
> & {
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

/**
 * Builds telemetrized options for callers that must keep TanStack's hook call explicit.
 */
export function createQueryOptionsV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: QueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): TelemetrizedMultiQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  return buildTelemetrizedQueryOptionsV2(config);
}

/**
 * Builds telemetrized suspense query options without invoking a TanStack hook.
 */
export function createSuspenseQueryOptionsV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SuspenseQueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): TelemetrizedSuspenseMultiQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  return buildTelemetrizedSuspenseQueryOptionsV2(config);
}

/**
 * Combines explicit 'enabled' flag with a check for a valid ID.
 * Queries are often disabled if the required ID is missing.
 */
const combineEnabledWithRequiredId = <TData, TTransformedData, TQueryKey extends QueryKey>(
  enabled: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'],
  hasId: boolean
): SingleQueryConfigV2<TData, TTransformedData, TQueryKey>['enabled'] => {
  if (!hasId) return false;
  if (enabled === undefined) return true;
  if (typeof enabled === 'function') {
    const enabledPredicate = enabled as SingleQueryEnabledPredicate;
    return (query: unknown): boolean => Boolean(enabledPredicate(query)) && hasId;
  }
  return Boolean(enabled);
};

/**
 * Hook for fetching a single entity by ID.
 * Automatically handles the 'enabled' state based on ID presence.
 * 
 * @param config - Configuration for the single query.
 * @returns A standardized SingleQuery object.
 */
export function useSingleQueryV2<
  TData,
  TTransformedData = TData,
  TQueryKey extends QueryKey = QueryKey,
>(config: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>): SingleQuery<TTransformedData> {
  const { queryKey, id, enabled, ...rest } = config;
  const resolvedQueryKey = typeof queryKey === 'function' ? queryKey(id ?? 'none') : queryKey;
  const requiresId = Object.prototype.hasOwnProperty.call(config, 'id');
  const hasId = id !== null && id !== undefined;
  const guardedEnabled = requiresId ? combineEnabledWithRequiredId(enabled, hasId) : enabled;

  return useQueryFactoryV2<TData, Error, TTransformedData, TQueryKey>({
    ...rest,
    queryKey: resolvedQueryKey,
    ...(guardedEnabled !== undefined ? { enabled: guardedEnabled } : {}),
  }) as SingleQuery<TTransformedData>;
}

/**
 * Factory for paginated list queries that keep previous data while loading.
 */
export function usePaginatedListQueryV2<TItem, TQueryKey extends QueryKey = QueryKey>(
  config: SingleQueryConfigV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>
): SingleQuery<PaginatedResult<TItem>> {
  const { placeholderData, meta, ...rest } = config;

  return useSingleQueryV2<PaginatedResult<TItem>, PaginatedResult<TItem>, TQueryKey>({
    ...rest,
    meta,
    placeholderData:
      placeholderData ?? keepPreviousPlaceholderData<PaginatedResult<TItem>>,
  });
}

/**
 * Factory for infinite queries.
 */
export function useInfiniteQueryV2<
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

/**
 * Hook for executing multiple queries in parallel.
 * 
 * @param config - Configuration containing the list of queries and an optional combine function.
 * @returns The combined results of all queries.
 */
export function useMultiQueryV2<
  TQueries extends readonly QueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = MultiQueryResultsV2<TQueries>,
>(config: MultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = Array.from(queries, (queryConfig) =>
    createQueryOptionsV2(queryConfig)
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

/**
 * Factory for suspense-enabled single queries.
 */
export function useSuspenseQueryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SuspenseQueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): UseSuspenseQueryResult<TData, TError> {
  return useSuspenseQueryFactoryV2(config);
}

/**
 * Factory for suspense-enabled infinite queries.
 */
export function useSuspenseInfiniteQueryV2<
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

/**
 * Hook for executing multiple suspense queries in parallel.
 */
export function useSuspenseMultiQueryV2<
  TQueries extends readonly SuspenseQueryDescriptorV2<unknown, unknown, unknown, QueryKey>[],
  TCombine = SuspenseMultiQueryResultsV2<TQueries>,
>(config: SuspenseMultiQueryConfigV2<TQueries, TCombine>): TCombine {
  const { queries, combine } = config;
  const queryOptions = Array.from(queries, (queryConfig) =>
    createSuspenseQueryOptionsV2(queryConfig)
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

/**
 * Hook for "save" mutations that handle both creation and updates.
 * Switches between createFn and updateFn based on whether variables.id is present.
 */
export function useSaveMutationV2<
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

/**
 * Core hook for mutations with automatic telemetry and invalidation support.
 */
type MutationFactoryAttemptRef = { current: number };

type MutationOptionsV2Runtime = {
  queryClient: QueryClient;
  attemptRef: MutationFactoryAttemptRef;
};

/**
 * Builds telemetrized mutation options for callers that must keep useMutation explicit.
 */
export function createMutationOptionsV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>,
  runtime: MutationOptionsV2Runtime
): UseMutationOptions<TData, TError, TVariables, TContext> {
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
  const { queryClient, attemptRef } = runtime;
  const normalizedMutationKey = mutationKey ? normalizeQueryKey(mutationKey) : undefined;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedMutationKey });
  const telemetryMeta = withMutationKeyMeta(meta, normalizedMutationKey);

  return {
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
    mutationFn: (variables: TVariables) => executeMutationFn(variables, {
      mutationFn,
      attemptRef,
      telemetryMeta,
      telemetryContext,
      normalizedMutationKey,
      transformError,
      queryClient,
    }),
  };
}

async function executeMutationFn<TData, TVariables, TError>(
  variables: TVariables,
  deps: {
    mutationFn?: (variables: TVariables, context: { queryClient: QueryClient }) => Promise<TData>;
    attemptRef: React.MutableRefObject<number>;
    telemetryMeta: any;
    telemetryContext?: any;
    normalizedMutationKey?: any;
    transformError?: (error: unknown) => TError;
    queryClient: QueryClient;
  }
): Promise<TData> {
  const { attemptRef, mutationFn, telemetryMeta, telemetryContext, normalizedMutationKey, transformError, queryClient } = deps;
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
    const finalError = transformError ? transformError(error) : (error as TError);

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
}

export function useMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  const attemptRef = useRef(0);
  const queryClient = useQueryClient();

  return useMutation(
    createMutationOptionsV2<TData, TVariables, TContext, TError>(config, {
      queryClient,
      attemptRef,
    })
  );
}

/**
 * Hook for mutations that perform optimistic UI updates.
 * Automatically handles canceling queries, setting data, and reverting on error.
 */
export function useOptimisticMutationV2<TData, TVariables, TCacheData = TData>(
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
        return onSettled({ data, error, variables, context, mutationContext });
      }
      return undefined;
    },
  });
}

/**
 * Hook that returns a function to ensure query data is present in the cache.
 * Uses pre-existing data if valid, otherwise fetches.
 */
export function useEnsureQueryDataV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<TData> {
  const queryClient = useQueryClient();
  return ensureQueryDataV2(queryClient, config);
}

/**
 * Hook that returns a function to prefetch a query.
 */
export function usePrefetchQueryV2<
  TQueryFnData,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<void> {
  const queryClient = useQueryClient();
  return prefetchQueryV2(queryClient, config);
}

/**
 * Hook that returns a function to fetch query data directly.
 */
export function useFetchQueryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>): () => Promise<TData> {
  const queryClient = useQueryClient();
  return fetchQueryV2(queryClient, config);
}

/**
 * Ensures query data is present in the cache using the provided client.
 */
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

/**
 * Prefetches query data using the provided client.
 */
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

/**
 * Fetches query data directly using the provided client.
 */
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

/**
 * Hook-style wrapper for 'create' mutations.
 */
export function useCreateMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}

/**
 * Hook-style wrapper for 'update' mutations.
 */
export function useUpdateMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}

/**
 * Hook-style wrapper for 'delete' mutations.
 */
export function useDeleteMutationV2<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationFactoryV2Config<TData, TVariables, TError, TContext>
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>(config);
}
