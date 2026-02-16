import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query';

import { classifyError } from '@/shared/errors/error-classifier';
import { emitTanstackTelemetry, getTanstackFactoryMetaFromBag } from '@/shared/lib/observability/tanstack-telemetry';
import { logClientError, isLoggableObject } from '@/shared/utils/observability/client-error-logger';
import { getTraceId } from '@/shared/utils/observability/trace';

import { isOfflineQuery } from './offline-support';

const QUERY_STALE_TIME_MS = 1000 * 60 * 5;
const OFFLINE_QUERY_STALE_TIME_MS = 1000 * 60 * 30;
const QUERY_GC_TIME_MS = 1000 * 60 * 60 * 24;
const QUERY_MAX_RETRIES = 2;
const MUTATION_MAX_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 1500;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const extractStatusCode = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;

  const withStatus = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };

  return (
    toFiniteNumber(withStatus.status) ??
    toFiniteNumber(withStatus.statusCode) ??
    toFiniteNumber(withStatus.response?.status)
  );
};

const isNetworkOrTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('load failed')
  );
};

const toStableKey = (key: QueryKey | undefined): string => {
  if (!key) return '[]';
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
};

const toAttempt = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 1;
  return Math.floor(value);
};

const safeLogCacheError = (
  source: 'QueryCache' | 'MutationCache',
  key: QueryKey | undefined,
  attempt: number | undefined,
  error: unknown,
  metaBag: unknown
): void => {
  try {
    const statusCode = extractStatusCode(error);
    const category = classifyError(error);
    const normalizedAttempt = toAttempt(attempt);
    const alreadyLogged = isLoggableObject(error) && error.__logged;

    if (!alreadyLogged) {
      const baseContext = {
        source,
        key: toStableKey(key),
        attempt: normalizedAttempt,
        statusCode,
        category,
        traceId: getTraceId(),
      };
      const context =
        source === 'QueryCache'
          ? { ...baseContext, queryKey: key }
          : { ...baseContext, mutationKey: key };

      logClientError(error, {
        context,
      });

      // Mark as logged to prevent double logging in useGlobalQueryErrorHandler
      if (isLoggableObject(error)) {
        try {
          error.__logged = true;
        } catch {
          // ignore read-only errors
        }
      }
    }

    const resolvedMeta = getTanstackFactoryMetaFromBag(metaBag);
    if (!resolvedMeta) {
      emitTanstackTelemetry({
        entity: source === 'QueryCache' ? 'query-cache' : 'mutation-cache',
        stage: 'error',
        meta: {
          source: `tanstack.${source.toLowerCase()}`,
          operation: source === 'QueryCache' ? 'detail' : 'action',
          resource: source === 'QueryCache' ? 'query-cache' : 'mutation-cache',
          ...(source === 'QueryCache' ? { queryKey: key } : {}),
          ...(source === 'MutationCache' ? { mutationKey: key } : {}),
          domain: 'global',
          samplingRate: 1,
          tags: ['cache', 'fallback'],
        },
        key,
        attempt: normalizedAttempt,
        error,
        ...(typeof statusCode === 'number' ? { statusCode } : {}),
        context: {
          source,
          category,
          statusCode,
          key: toStableKey(key),
        },
      });
    }
  } catch {
    // Cache callbacks must never throw.
  }
};

const shouldRetry = (failureCount: number, error: unknown, maxRetries: number): boolean => {
  const statusCode = extractStatusCode(error);
  if (statusCode !== null) {
    if (statusCode >= 400 && statusCode < 500) return false;
    if (statusCode >= 500) return failureCount < maxRetries;
  }

  if (isNetworkOrTimeoutError(error)) {
    return failureCount < maxRetries;
  }

  return false;
};

const getRetryDelay = (attemptIndex: number): number =>
  Math.min(RETRY_BASE_DELAY_MS * 2 ** attemptIndex, RETRY_MAX_DELAY_MS);

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        safeLogCacheError(
          'QueryCache',
          query.queryKey,
          query.state.fetchFailureCount,
          error,
          query.meta
        );
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation, _context) => {
        safeLogCacheError(
          'MutationCache',
          mutation.options.mutationKey,
          mutation.state.failureCount,
          error,
          mutation.meta ?? mutation.options.meta
        );
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: (query): number =>
          isOfflineQuery(query.queryKey) ? OFFLINE_QUERY_STALE_TIME_MS : QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        // Prefer explicit invalidation/refresh over implicit focus/reconnect refetches
        // to reduce duplicate requests across mounted views/modals.
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
        retry: (failureCount: number, error: unknown): boolean =>
          shouldRetry(failureCount, error, QUERY_MAX_RETRIES),
        // Keep retries short to avoid long wait paths that impact SSR-sensitive screens.
        retryDelay: getRetryDelay,
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: (failureCount: number, error: unknown): boolean =>
          shouldRetry(failureCount, error, MUTATION_MAX_RETRIES),
        retryDelay: getRetryDelay,
        networkMode: 'online',
      },
    },
  });
