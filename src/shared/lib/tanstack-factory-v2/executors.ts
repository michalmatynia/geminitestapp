import { type QueryClient, type QueryKey, type QueryFunctionContext } from '@tanstack/react-query';

import { telemetryErrorStage } from '@/shared/lib/observability/tanstack-telemetry';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

import { emitFactoryTelemetry, withQueryKeyMeta } from './telemetry';
import { EnsureQueryDataV2Config, ManualQueryExecutorInput, QueryFactoryFn } from './types';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


export const invokeQueryFactoryFn = <TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>,
  context: QueryFunctionContext<TQueryKey>
): Promise<TQueryFnData> =>
    (queryFn as (ctx: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>)(context);

export const createManualQueryExecutor = <
  TQueryFnData,
  TError,
  TResult,
  TQueryKey extends QueryKey = QueryKey,
>(
    queryClient: QueryClient,
    config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>,
    executor: (input: ManualQueryExecutorInput<TQueryFnData, TQueryKey>) => Promise<TResult>,
    options?: { swallowErrors?: boolean }
  ): (() => Promise<TResult | undefined>) => {
  const { queryKey, queryFn, meta, telemetryContext, transformError, staleTime } = config;
  const shouldLogError = config.logError !== false;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);

  return async (): Promise<TResult | undefined> => {
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
      const data = await executor({
        queryClient,
        normalizedQueryKey,
        queryFn,
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

      return data;
    } catch (error) {
      if (shouldLogError) {
        logClientCatch(error, {
          source: 'tanstack-factory-v2.executors',
          action: 'createManualQueryExecutor',
        });
      }
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

      if (options?.swallowErrors) {
        return undefined;
      }

      const finalError = transformError ? transformError(error) : (error as TError);
      throw finalError;
    }
  };
};

export function ensureQueryDataV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>
): () => Promise<TData> {
  return createManualQueryExecutor<TQueryFnData, TError, TData, TQueryKey>(
    queryClient,
    config,
    async ({ queryClient: currentQueryClient, normalizedQueryKey, queryFn, staleTime }) => {
      const data = await currentQueryClient.ensureQueryData({
        queryKey: normalizedQueryKey,
        queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
        staleTime,
      });

      return data as TData;
    }
  ) as () => Promise<TData>;
}

export function prefetchQueryV2<
  TQueryFnData,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  config: EnsureQueryDataV2Config<TQueryFnData, TError, TQueryKey>
): () => Promise<void> {
  return createManualQueryExecutor<TQueryFnData, TError, void, TQueryKey>(
    queryClient,
    config,
    async ({ queryClient: currentQueryClient, normalizedQueryKey, queryFn, staleTime }) => {
      await currentQueryClient.prefetchQuery({
        queryKey: normalizedQueryKey,
        queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
        staleTime,
      });
    },
    { swallowErrors: true }
  ) as () => Promise<void>;
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
  return createManualQueryExecutor<TQueryFnData, TError, TData, TQueryKey>(
    queryClient,
    config,
    async ({ queryClient: currentQueryClient, normalizedQueryKey, queryFn, staleTime }) => {
      const data = await currentQueryClient.fetchQuery({
        queryKey: normalizedQueryKey,
        queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
        staleTime,
      });

      return data as TData;
    }
  ) as () => Promise<TData>;
}
