import {
  QueryOptionsWithoutCore,
  InfiniteQueryOptionsWithoutCore,
  SuspenseInfiniteQueryOptionsWithoutCore,
  SuspenseQueryOptionsWithoutCore,
} from './types';

import type { QueryKey } from '@tanstack/react-query';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


export const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;
const MIN_REFETCH_INTERVAL_MS = 1;

export type AnyRefetchIntervalOption<TQuery = unknown> =
  | number
  | false
  | ((query: TQuery) => number | false | undefined);

type QueryLikeWithEnabledOption = {
  options?: {
    enabled?: boolean | ((query: unknown) => boolean);
  };
};

export const sanitizeRefetchIntervalValue = (
  value: number | false | undefined
): number | false | undefined => {
  if (value === false || value === undefined) return value;
  if (!Number.isFinite(value) || value < MIN_REFETCH_INTERVAL_MS) return false;
  return value;
};

export const isRefetchEnabledForQuery = (query: unknown): boolean => {
  if (!query || typeof query !== 'object') return true;

  const enabled = (query as QueryLikeWithEnabledOption).options?.enabled;
  if (enabled === undefined) return true;

  if (typeof enabled === 'function') {
    try {
      return Boolean(enabled(query));
    } catch (error) {
      logClientCatch(error, {
        source: 'tanstack-factory-v2.guards',
        action: 'isRefetchEnabledForQuery',
        level: 'warn',
      });
      return false;
    }
  }

  return enabled !== false;
};

export const guardRefetchInterval = <TQuery>(
  option: AnyRefetchIntervalOption<TQuery> | undefined
): AnyRefetchIntervalOption<TQuery> | undefined => {
  if (option === undefined) return option;

  if (typeof option === 'function') {
    const callback = option as (query: TQuery) => number | false | undefined;
    const wrapped = ((query: TQuery): number | false | undefined => {
      if (!isRefetchEnabledForQuery(query)) return false;

      let nextValue: number | false | undefined;
      try {
        nextValue = callback(query);
      } catch (error) {
        logClientCatch(error, {
          source: 'tanstack-factory-v2.guards',
          action: 'guardRefetchInterval',
          level: 'warn',
        });
        return false;
      }

      return sanitizeRefetchIntervalValue(nextValue);
    }) as AnyRefetchIntervalOption<TQuery>;
    return wrapped;
  }

  return sanitizeRefetchIntervalValue(option);
};

type QueryRuntimeDefaults = {
  staleTime?: unknown;
  refetchOnMount?: unknown;
  refetchOnWindowFocus?: unknown;
  refetchOnReconnect?: unknown;
  refetchIntervalInBackground?: unknown;
};

const applyQueryRuntimeDefaults = <TOptions extends QueryRuntimeDefaults>(
  options: TOptions
): TOptions => {
  return {
    ...options,
    staleTime: (options['staleTime'] ?? DEFAULT_STALE_TIME_MS) as TOptions['staleTime'],
    refetchOnMount: (options['refetchOnMount'] ?? false) as TOptions['refetchOnMount'],
    refetchOnWindowFocus: (options['refetchOnWindowFocus'] ??
      false) as TOptions['refetchOnWindowFocus'],
    refetchOnReconnect: (options['refetchOnReconnect'] ?? false) as TOptions['refetchOnReconnect'],
    refetchIntervalInBackground: (options['refetchIntervalInBackground'] ??
      false) as TOptions['refetchIntervalInBackground'],
  };
};

const applyGuardedRefetchInterval = <
  TOptions extends {
    refetchInterval?: unknown;
  },
>(
  options: TOptions,
  guardedRefetchInterval: TOptions['refetchInterval']
): TOptions => {
  if (guardedRefetchInterval !== undefined) {
    return {
      ...options,
      refetchInterval: guardedRefetchInterval,
    };
  }

  return options;
};

const disableGuardedRefetchInterval = <
  TOptions extends {
    refetchInterval?: unknown;
  },
>(
  options: TOptions
): TOptions => ({
  ...options,
  refetchInterval: false as TOptions['refetchInterval'],
});

export function applyQueryRuntimeGuards<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  options: QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey>
): QueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> {
  const { refetchInterval, ...rest } = options;
  const base = applyQueryRuntimeDefaults(rest);
  const guardedRefetchInterval = guardRefetchInterval(refetchInterval);

  if (options['enabled'] === false) {
    return disableGuardedRefetchInterval(base);
  }

  return applyGuardedRefetchInterval(base, guardedRefetchInterval);
}

export function applySuspenseQueryRuntimeGuards<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(
  options: SuspenseQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey>
): SuspenseQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey> {
  const { refetchInterval, ...rest } = options;
  const base = applyQueryRuntimeDefaults(rest);
  const guardedRefetchInterval = guardRefetchInterval(refetchInterval);

  return applyGuardedRefetchInterval(base, guardedRefetchInterval);
}

export function applyInfiniteQueryRuntimeGuards<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
>(
  options: InfiniteQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey, TPageParam>
): InfiniteQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey, TPageParam> {
  const { refetchInterval, ...rest } = options;
  const base = applyQueryRuntimeDefaults(rest);
  const guardedRefetchInterval = guardRefetchInterval(refetchInterval);

  if (options['enabled'] === false) {
    return disableGuardedRefetchInterval(base);
  }

  return applyGuardedRefetchInterval(base, guardedRefetchInterval);
}

export function applySuspenseInfiniteQueryRuntimeGuards<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
>(
  options: SuspenseInfiniteQueryOptionsWithoutCore<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >
): SuspenseInfiniteQueryOptionsWithoutCore<TQueryFnData, TError, TData, TQueryKey, TPageParam> {
  const { refetchInterval, ...rest } = options;
  const base = applyQueryRuntimeDefaults(rest);
  const guardedRefetchInterval = guardRefetchInterval(refetchInterval);

  return applyGuardedRefetchInterval(base, guardedRefetchInterval);
}
