'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
  type QueryFunctionContext,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useRef } from 'react';

import {
  attachTanstackFactoryMeta,
  emitTanstackTelemetry,
  telemetryErrorStage,
  resolveTanstackFactoryMeta,
} from '@/shared/lib/observability/tanstack-telemetry';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { TanstackFactoryMeta, TanstackLifecycleStage } from '@/shared/lib/tanstack-factory-v2.types';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;
const MIN_REFETCH_INTERVAL_MS = 1;

type QueryFactoryFn<TQueryFnData, TQueryKey extends QueryKey> =
  | (() => Promise<TQueryFnData>)
  | ((context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>);

type BaseQueryFactoryV2Config<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn' | 'meta'> & {
  queryKey: TQueryKey;
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
};

type InfiniteQueryFactoryV2Config<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn' | 'meta'
> & {
  queryKey: TQueryKey;
  queryFn: (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
};

type MutationFactoryV2Config<
  TData,
  TVariables,
  TError = Error,
  TContext = unknown,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn' | 'meta'> & {
  mutationFn: (variables: TVariables) => Promise<TData>;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
};

type SingleQueryConfigV2<TData, TTransformedData = TData, TQueryKey extends QueryKey = QueryKey> = Omit<
  UseQueryOptions<TData, Error, TTransformedData, TQueryKey>,
  'queryKey' | 'queryFn' | 'meta'
> & {
  queryKey: TQueryKey | ((id: string) => TQueryKey);
  queryFn: QueryFactoryFn<TData, TQueryKey>;
  id?: string | null | undefined;
  meta: TanstackFactoryMeta;
  telemetryContext?: Record<string, unknown> | undefined;
};

type AnyRefetchIntervalOption =
  | number
  | false
  | ((query: unknown) => number | false | undefined);

type QueryLikeWithEnabledOption = {
  options?: {
    enabled?: boolean | ((query: unknown) => boolean);
  };
};

type EmitFactoryTelemetryInput = {
  entity: 'query' | 'mutation';
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

const applyQueryRuntimeGuards = <
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(
    options: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    'queryKey' | 'queryFn' | 'meta'
  >
  ): Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn' | 'meta'> => {
  const { refetchInterval, ...rest } = options;
  const guardedRefetchInterval = guardRefetchInterval(
    refetchInterval as unknown as AnyRefetchIntervalOption | undefined
  ) as Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    'queryKey' | 'queryFn' | 'meta'
  >['refetchInterval'];
  const isStaticallyDisabled = options.enabled === false;

  const base = {
    ...rest,
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME_MS,
    refetchOnMount: options.refetchOnMount ?? false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? false,
    refetchIntervalInBackground: options.refetchIntervalInBackground ?? false,
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
    options: Omit<
    UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
    'queryKey' | 'queryFn' | 'meta'
  >
  ): Omit<
  UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn' | 'meta'
> => {
  const { refetchInterval, ...rest } = options;
  const guardedRefetchInterval = guardRefetchInterval(
    refetchInterval as unknown as AnyRefetchIntervalOption | undefined
  ) as Omit<
    UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
    'queryKey' | 'queryFn' | 'meta'
  >['refetchInterval'];
  const isStaticallyDisabled = options.enabled === false;

  const base = {
    ...rest,
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME_MS,
    refetchOnMount: options.refetchOnMount ?? false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? false,
    refetchIntervalInBackground: options.refetchIntervalInBackground ?? false,
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
    ...(typeof startedAtMs === 'number'
      ? { durationMs: Date.now() - startedAtMs }
      : {}),
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

function useQueryFactoryV2<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: BaseQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const { meta, queryFn, telemetryContext, queryKey, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);
  const guardedOptions = applyQueryRuntimeGuards(options);
  const attemptRef = useRef(0);

  return useQuery({
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: async (context): Promise<TQueryFnData> => {
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      if (attempt > 1) {
        emitFactoryTelemetry({
          entity: 'query',
          stage: 'retry',
          meta: telemetryMeta,
          key: normalizedQueryKey,
          attempt,
          ...(telemetryContext ? { context: telemetryContext } : {}),
        });
      }

      const startMs = Date.now();
      emitFactoryTelemetry({
        entity: 'query',
        stage: 'start',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });

      try {
        const data = await invokeQueryFactoryFn(queryFn, context);
        emitFactoryTelemetry({
          entity: 'query',
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
        emitFactoryTelemetry({
          entity: 'query',
          stage: telemetryErrorStage(error),
          meta: telemetryMeta,
          key: normalizedQueryKey,
          attempt,
          startedAtMs: startMs,
          error,
          ...(telemetryContext ? { context: telemetryContext } : {}),
        });
        throw error;
      }
    },
  });
}

export function createListQueryV2<TData, TQueryFnData = TData[]>(
  config: BaseQueryFactoryV2Config<TQueryFnData, Error, TQueryFnData>
): ListQuery<TData, TQueryFnData> {
  return useQueryFactoryV2<TQueryFnData, Error, TQueryFnData>(config) as ListQuery<TData, TQueryFnData>;
}

export function createSingleQueryV2<TData, TTransformedData = TData, TQueryKey extends QueryKey = QueryKey>(
  config: SingleQueryConfigV2<TData, TTransformedData, TQueryKey>
): SingleQuery<TTransformedData> {
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

export function createInfiniteQueryV2<
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  config: InfiniteQueryFactoryV2Config<TQueryFnData, TError, TData, TQueryKey, TPageParam>
): UseInfiniteQueryResult<TData, TError> {
  const { queryKey, queryFn, meta, telemetryContext, ...options } = config;
  const normalizedQueryKey = normalizeQueryKey(queryKey) as TQueryKey;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedQueryKey });
  const telemetryMeta = withQueryKeyMeta(meta, normalizedQueryKey);
  const guardedOptions = applyInfiniteQueryRuntimeGuards(options);
  const attemptRef = useRef(0);

  const queryOptions: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> = {
    ...guardedOptions,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: async (context): Promise<TQueryFnData> => {
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      if (attempt > 1) {
        emitFactoryTelemetry({
          entity: 'query',
          stage: 'retry',
          meta: telemetryMeta,
          key: normalizedQueryKey,
          attempt,
          ...(telemetryContext ? { context: telemetryContext } : {}),
        });
      }

      const startMs = Date.now();
      emitFactoryTelemetry({
        entity: 'query',
        stage: 'start',
        meta: telemetryMeta,
        key: normalizedQueryKey,
        attempt,
        ...(telemetryContext ? { context: telemetryContext } : {}),
      });

      try {
        const data = await queryFn(context as QueryFunctionContext<TQueryKey, TPageParam>);
        emitFactoryTelemetry({
          entity: 'query',
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
        emitFactoryTelemetry({
          entity: 'query',
          stage: telemetryErrorStage(error),
          meta: telemetryMeta,
          key: normalizedQueryKey,
          attempt,
          startedAtMs: startMs,
          error,
          ...(telemetryContext ? { context: telemetryContext } : {}),
        });
        throw error;
      }
    },
  };

  return useInfiniteQuery(queryOptions);
}

export function createMutationV2<TData, TVariables, TContext = unknown>(
  config: MutationFactoryV2Config<TData, TVariables, Error, TContext>
): MutationResult<TData, TVariables> {
  const { mutationFn, meta, mutationKey, telemetryContext, ...options } = config;
  const normalizedMutationKey = mutationKey ? normalizeQueryKey(mutationKey) : undefined;
  const resolvedMeta = resolveTanstackFactoryMeta(meta, { key: normalizedMutationKey });
  const telemetryMeta = withMutationKeyMeta(meta, normalizedMutationKey);
  const attemptRef = useRef(0);

  return useMutation({
    ...options,
    ...(normalizedMutationKey ? { mutationKey: normalizedMutationKey } : {}),
    meta: attachTanstackFactoryMeta(resolvedMeta),
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
        const data = await mutationFn(variables);
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
        throw error;
      }
    },
  });
}

export const queryFactoriesV2TestUtils = {
  guardRefetchInterval,
  isRefetchEnabledForQuery,
  sanitizeRefetchIntervalValue,
};

export const createCreateMutationV2 = createMutationV2;
export const createUpdateMutationV2 = createMutationV2;
export const createDeleteMutationV2 = createMutationV2;
