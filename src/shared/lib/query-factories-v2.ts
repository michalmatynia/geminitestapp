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
import { inferLegacyFactoryMeta } from '@/shared/lib/tanstack-factory-meta-inference';
import type { TanstackFactoryMeta } from '@/shared/lib/tanstack-factory-v2.types';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/types/query-result-types';

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

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

type ListQueryOptions<TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TQueryFnData, QueryKey>,
  'queryKey' | 'queryFn' | 'meta'
>;

type SingleQueryOptions<TData, TTransformedData> = Omit<
  UseQueryOptions<TData, Error, TTransformedData, QueryKey>,
  'queryKey' | 'queryFn' | 'meta'
>;

export type ListQueryConfig<TData, TQueryFnData = TData[]> = {
  queryKey: QueryKey;
  queryFn: QueryFactoryFn<TQueryFnData, QueryKey>;
  options?: ListQueryOptions<TQueryFnData> | undefined;
} & ListQueryOptions<TQueryFnData>;

export type SingleQueryConfig<TData, TTransformedData = TData> = {
  queryKey: QueryKey | ((id: string) => QueryKey);
  queryFn: QueryFactoryFn<TData, QueryKey>;
  id?: string | null | undefined;
  options?: SingleQueryOptions<TData, TTransformedData> | undefined;
} & SingleQueryOptions<TData, TTransformedData>;

type MutationFactoryConfig<TData, TVariables, TContext = unknown> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  options?: Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn' | 'meta'> | undefined;
};

const invokeQueryFactoryFn = <TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFactoryFn<TQueryFnData, TQueryKey>,
  context: QueryFunctionContext<TQueryKey>
): Promise<TQueryFnData> => {
  if (queryFn.length === 0) {
    return (queryFn as () => Promise<TQueryFnData>)();
  }
  return (queryFn as (ctx: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>)(context);
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
  const attemptRef = useRef(0);

  return useQuery({
    ...options,
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME_MS,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: async (context): Promise<TQueryFnData> => {
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      if (attempt > 1) {
        emitTanstackTelemetry({
          entity: 'query',
          stage: 'retry',
          meta: {
            ...meta,
            queryKey: normalizedQueryKey,
          },
          key: normalizedQueryKey,
          attempt,
          context: telemetryContext,
        });
      }

      const startMs = Date.now();
      emitTanstackTelemetry({
        entity: 'query',
        stage: 'start',
        meta: {
          ...meta,
          queryKey: normalizedQueryKey,
        },
        key: normalizedQueryKey,
        attempt,
        context: telemetryContext,
      });

      try {
        const data = await invokeQueryFactoryFn(queryFn, context);
        emitTanstackTelemetry({
          entity: 'query',
          stage: 'success',
          meta: {
            ...meta,
            queryKey: normalizedQueryKey,
          },
          key: normalizedQueryKey,
          attempt,
          durationMs: Date.now() - startMs,
          context: telemetryContext,
        });
        attemptRef.current = 0;
        return data;
      } catch (error) {
        emitTanstackTelemetry({
          entity: 'query',
          stage: telemetryErrorStage(error),
          meta: {
            ...meta,
            queryKey: normalizedQueryKey,
          },
          key: normalizedQueryKey,
          attempt,
          durationMs: Date.now() - startMs,
          error,
          context: telemetryContext,
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

  return useQueryFactoryV2<TData, Error, TTransformedData, TQueryKey>({
    ...rest,
    queryKey: resolvedQueryKey,
    enabled: (enabled ?? true) && id !== null && id !== undefined,
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
  const attemptRef = useRef(0);

  const queryOptions: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> = {
    ...options,
    queryKey: normalizedQueryKey,
    meta: attachTanstackFactoryMeta(resolvedMeta),
    queryFn: async (context): Promise<TQueryFnData> => {
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      if (attempt > 1) {
        emitTanstackTelemetry({
          entity: 'query',
          stage: 'retry',
          meta: {
            ...meta,
            queryKey: normalizedQueryKey,
          },
          key: normalizedQueryKey,
          attempt,
          context: telemetryContext,
        });
      }

      const startMs = Date.now();
      emitTanstackTelemetry({
        entity: 'query',
        stage: 'start',
        meta: {
          ...meta,
          queryKey: normalizedQueryKey,
        },
        key: normalizedQueryKey,
        attempt,
        context: telemetryContext,
      });

      try {
        const data = await queryFn(context as QueryFunctionContext<TQueryKey, TPageParam>);
        emitTanstackTelemetry({
          entity: 'query',
          stage: 'success',
          meta: {
            ...meta,
            queryKey: normalizedQueryKey,
          },
          key: normalizedQueryKey,
          attempt,
          durationMs: Date.now() - startMs,
          context: telemetryContext,
        });
        attemptRef.current = 0;
        return data;
      } catch (error) {
        emitTanstackTelemetry({
          entity: 'query',
          stage: telemetryErrorStage(error),
          meta: {
            ...meta,
            queryKey: normalizedQueryKey,
          },
          key: normalizedQueryKey,
          attempt,
          durationMs: Date.now() - startMs,
          error,
          context: telemetryContext,
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
  const attemptRef = useRef(0);

  return useMutation({
    ...options,
    ...(normalizedMutationKey ? { mutationKey: normalizedMutationKey } : {}),
    meta: attachTanstackFactoryMeta(resolvedMeta),
    mutationFn: async (variables: TVariables): Promise<TData> => {
      const attempt = attemptRef.current + 1;
      attemptRef.current = attempt;
      if (attempt > 1) {
        emitTanstackTelemetry({
          entity: 'mutation',
          stage: 'retry',
          meta: {
            ...meta,
            mutationKey: normalizedMutationKey,
          },
          key: normalizedMutationKey,
          attempt,
          context: telemetryContext,
        });
      }

      const startMs = Date.now();
      emitTanstackTelemetry({
        entity: 'mutation',
        stage: 'start',
        meta: {
          ...meta,
          mutationKey: normalizedMutationKey,
        },
        key: normalizedMutationKey,
        attempt,
        context: telemetryContext,
      });

      try {
        const data = await mutationFn(variables);
        emitTanstackTelemetry({
          entity: 'mutation',
          stage: 'success',
          meta: {
            ...meta,
            mutationKey: normalizedMutationKey,
          },
          key: normalizedMutationKey,
          attempt,
          durationMs: Date.now() - startMs,
          context: telemetryContext,
        });
        attemptRef.current = 0;
        return data;
      } catch (error) {
        emitTanstackTelemetry({
          entity: 'mutation',
          stage: telemetryErrorStage(error),
          meta: {
            ...meta,
            mutationKey: normalizedMutationKey,
          },
          key: normalizedMutationKey,
          attempt,
          durationMs: Date.now() - startMs,
          error,
          context: telemetryContext,
        });
        throw error;
      }
    },
  });
}

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

export const createCreateMutationV2 = createMutationV2;
export const createUpdateMutationV2 = createMutationV2;
export const createDeleteMutationV2 = createMutationV2;
