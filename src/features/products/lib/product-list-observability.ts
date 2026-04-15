'use client';

// product-list observability: centralized helpers for logging UI debug events
// related to product list queries. The helpers are gateable via URL query
// (`?productListDebug=1`) and ship throttled system logs to /api/system/logs.
// Useful for diagnosing flaky queries and user-reported issues in production.
import type { SystemLogsCreateRequest } from '@/shared/contracts/observability';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logger } from '@/shared/utils/logger';
import { getTraceId } from '@/shared/utils/observability/trace';

const PRODUCT_LIST_DEBUG_PARAM = 'productListDebug';
const GLOBAL_DEBUG_PARAM = 'debug';
const ENABLED_DEBUG_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_THROTTLE_MS = 1_000;
const DEBUG_LOG_SOURCE = 'products.product-list.debug';
const DEBUG_LOG_SERVICE = 'products.product-list';
const DEBUG_LOG_ENDPOINT = '/api/system/logs';
const DEBUG_LOG_CATEGORY = 'UI';
const DEBUG_LOG_FAILURE_THROTTLE_MS = 5_000;

type ProductListDebugLogState = {
  at: number;
  signature: string;
};

const recentProductListDebugLogs = new Map<string, ProductListDebugLogState>();
const recentProductListDebugTransportFailures = new Map<string, number>();

const readDebugValue = (params: URLSearchParams, key: string): string =>
  params.get(key)?.trim().toLowerCase() ?? '';

const isEnabledDebugValue = (value: string): boolean =>
  value.length > 0 && ENABLED_DEBUG_VALUES.has(value);

const stableSerialize = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? 'null';
  } catch {
    return String(value);
  }
};

export const isProductListDebugSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return (
    isEnabledDebugValue(readDebugValue(params, PRODUCT_LIST_DEBUG_PARAM)) ||
    isEnabledDebugValue(readDebugValue(params, GLOBAL_DEBUG_PARAM))
  );
};

export const isProductListDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isProductListDebugSearch(window.location.search);
};

export const resetProductListObservabilityStateForTests = (): void => {
  recentProductListDebugLogs.clear();
  recentProductListDebugTransportFailures.clear();
};

const buildSystemLogPayload = (
  event: string,
  context?: Record<string, unknown>
): SystemLogsCreateRequest => ({
  level: 'info',
  message: `[ProductListDebug] ${event}`,
  category: DEBUG_LOG_CATEGORY,
  source: DEBUG_LOG_SOURCE,
  service: DEBUG_LOG_SERVICE,
  path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  context: {
    debugSurface: 'product-list',
    event,
    ...(context ?? {}),
  },
});

const shouldThrottleTransportFailure = (signature: string): boolean => {
  const now = Date.now();
  const previous = recentProductListDebugTransportFailures.get(signature);
  if (typeof previous === 'number' && now - previous < DEBUG_LOG_FAILURE_THROTTLE_MS) {
    return true;
  }
  recentProductListDebugTransportFailures.set(signature, now);
  return false;
};

const reportTransportFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  if (shouldThrottleTransportFailure(message)) {
    return;
  }

  logger.warn('[ProductListDebug] Failed to ship centralized log', {
    error,
  });
};

const shipProductListDebugLog = (event: string, context?: Record<string, unknown>): void => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId =
    controller !== null
      ? window.setTimeout(() => {
          controller.abort();
        }, DEBUG_LOG_FAILURE_THROTTLE_MS)
      : null;

  void fetch(DEBUG_LOG_ENDPOINT, {
    method: 'POST',
    headers: withCsrfHeaders({
      'Content-Type': 'application/json',
      'X-Trace-Id': getTraceId(),
    }),
    credentials: 'same-origin',
    body: JSON.stringify(buildSystemLogPayload(event, context)),
    keepalive: true,
    ...(controller ? { signal: controller.signal } : {}),
  })
    .then(async (response) => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (response.ok) return;

      let details = '';
      try {
        details = (await response.text()).trim();
      } catch {
        details = '';
      }

      throw new Error(
        `System log request failed with status ${response.status}${
          details ? `: ${details.slice(0, 200)}` : ''
        }`
      );
    })
    .catch((error: unknown) => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      reportTransportFailure(error);
    });
};

export const logProductListDebug = (
  event: string,
  context?: Record<string, unknown>,
  options?: {
    dedupeKey?: string;
    throttleMs?: number;
  }
): void => {
  if (!isProductListDebugEnabled()) return;

  const throttleMs = Math.max(0, options?.throttleMs ?? DEFAULT_THROTTLE_MS);
  const dedupeKey = options?.dedupeKey ?? event;
  const signature = stableSerialize(context ?? null);
  const now = Date.now();
  const previous = recentProductListDebugLogs.get(dedupeKey);

  if (previous?.signature === signature && now - previous.at < throttleMs) {
    return;
  }

  recentProductListDebugLogs.set(dedupeKey, { at: now, signature });

  logger.info('[ProductListDebug]', {
    event,
    ...(context ?? {}),
  });

  shipProductListDebugLog(event, context);
};
