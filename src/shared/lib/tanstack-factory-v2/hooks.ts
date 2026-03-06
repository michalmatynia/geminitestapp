'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  type QueryKey,
  type QueryFunctionContext,
  useQuery,
  type UseQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type UseSuspenseQueryOptions,
} from '@tanstack/react-query';
import { useRef } from 'react';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import {
  attachTanstackFactoryMeta,
  resolveTanstackFactoryMeta,
  telemetryErrorStage,
} from '@/shared/lib/observability/tanstack-telemetry';
import { TanstackFactoryMeta } from '../tanstack-factory-v2.types';
import {
  BaseQueryFactoryV2Config,
  QueryDescriptorV2,
  QueryOptionsWithoutCore,
  SuspenseQueryDescriptorV2,
} from './types';
import { emitFactoryTelemetry, withQueryKeyMeta } from './telemetry';
import { applyQueryRuntimeGuards } from './guards';
import { invokeQueryFactoryFn } from './executors';

const createTelemetrizedQueryFnInternal = <
  TQueryFnData,
  TError,
  TQueryKey extends QueryKey,
  TPageParam = never,
>(
    config: {
    meta: TanstackFactoryMeta;
    queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
    telemetryContext?: Record<string, unknown> | undefined;
    transformError?: (error: unknown) => TError;
    entity?: 'query' | 'query-batch';
  },
    normalizedQueryKey: TQueryKey,
    attemptRef: { current: number }
  ): ((context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>) => {
  const { meta, queryFn, telemetryContext, transformError, entity = 'query' } = config;
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);

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
};

export function useTelemetrizedQueryFn<
  TQueryFnData,
  TError,
  TQueryKey extends QueryKey,
  TPageParam = never,
>(
  config: {
    meta: TanstackFactoryMeta;
    queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
    telemetryContext?: Record<string, unknown> | undefined;
    transformError?: (error: unknown) => TError;
    entity?: 'query' | 'query-batch';
  },
  normalizedQueryKey: TQueryKey
): (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData> {
  return createTelemetrizedQueryFnInternal(config, normalizedQueryKey, useRef(0));
}

export function useTelemetrizedMultiQueryOptionsV2<
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
  const telemetrizedQueryFn = createTelemetrizedQueryFnInternal(
    {
      meta,
      queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
      telemetryContext,
      transformError,
      entity: 'query-batch',
    },
    normalizedQueryKey,
    { current: 0 }
  );

  return {
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  };
}

export function useTelemetrizedSuspenseMultiQueryOptionsV2<
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
  const telemetrizedQueryFn = createTelemetrizedQueryFnInternal(
    {
      meta,
      queryFn: (context) => invokeQueryFactoryFn(queryFn, context),
      telemetryContext,
      transformError,
      entity: 'query-batch',
    },
    normalizedQueryKey,
    { current: 0 }
  );

  return {
    ...(guardedOptions as any),
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  };
}

export function useQueryFactoryV2<
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

export function useSuspenseQueryFactoryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: SuspenseQueryDescriptorV2<TQueryFnData, TError, TData, TQueryKey>
): UseSuspenseQueryResult<TData, TError> {
  const { meta, queryFn, telemetryContext, queryKey, transformError, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const guardedOptions = applyQueryRuntimeGuards(options as any);

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
    ...(guardedOptions as any),
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: telemetrizedQueryFn,
  });
}
