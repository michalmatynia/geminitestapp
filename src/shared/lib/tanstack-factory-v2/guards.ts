import { type QueryKey } from '@tanstack/react-query';
import { QueryOptionsWithoutCore, InfiniteQueryOptionsWithoutCore } from './types';

export const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;
const MIN_REFETCH_INTERVAL_MS = 1;

export type AnyRefetchIntervalOption =
  | number
  | false
  | ((query: unknown) => number | false | undefined);

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
    } catch {
      return false;
    }
  }

  return enabled !== false;
};

export const guardRefetchInterval = <TOption extends AnyRefetchIntervalOption | undefined>(
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

export const applyQueryRuntimeGuards = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
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

export const applyInfiniteQueryRuntimeGuards = <
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
