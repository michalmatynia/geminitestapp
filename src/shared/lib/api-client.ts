import type { ErrorCategory, SuggestedAction } from '@/shared/contracts/observability';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError, isLoggableObject } from '@/shared/utils/observability/client-error-logger';
import { isAbortLikeError } from '@/shared/utils/observability/is-abort-like-error';
import { getTraceId } from '@/shared/utils/observability/trace';

export type ApiClientOptions = {
  [K in keyof RequestInit]?: RequestInit[K] | undefined;
} & {
  params?: Record<string, string | number | boolean | undefined> | undefined;
  logError?: boolean | undefined;
  timeout?: number | undefined;
};

export class ApiError extends Error {
  status: number;
  errorId?: string | undefined;
  category?: ErrorCategory | string | undefined;
  suggestedActions?: SuggestedAction[] | undefined;
  retryAfterMs?: number | undefined;
  payload?: unknown | undefined;
  __logged?: boolean;
  endpoint?: string;
  method?: string;

  constructor(
    message: string,
    status: number,
    errorId?: string | undefined,
    category?: ErrorCategory | string | undefined,
    suggestedActions?: SuggestedAction[] | undefined,
    retryAfterMs?: number | undefined
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorId = errorId;
    this.category = category;
    this.suggestedActions = suggestedActions;
    this.retryAfterMs = retryAfterMs;
  }
}

type ApiClientCooldownEntry = {
  untilMs: number;
  message: string;
  status: number;
  errorId?: string | undefined;
  category?: ErrorCategory | string | undefined;
  suggestedActions?: SuggestedAction[] | undefined;
};

const browserGetInFlightRequests = new Map<string, Promise<unknown>>();
const browserGetCooldowns = new Map<string, ApiClientCooldownEntry>();

const isAbortSignalInstance = (value: unknown): value is AbortSignal => {
  if (!value || typeof value !== 'object') return false;
  if (typeof AbortSignal === 'undefined') return false;
  return value instanceof AbortSignal;
};

/**
 * Removes undefined keys from an object to satisfy exactOptionalPropertyTypes
 */
function cleanConfig<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

const isBrowserRuntime = (): boolean => typeof window !== 'undefined';

const normalizeMethod = (method: string | undefined, hasBody: boolean): string =>
  (method || (hasBody ? 'POST' : 'GET')).toUpperCase();

const buildRequestKey = (method: string, url: string): string => `${method}:${url}`;

const clearExpiredCooldown = (requestKey: string, nowMs: number): void => {
  const current = browserGetCooldowns.get(requestKey);
  if (!current) {
    return;
  }

  if (current.untilMs <= nowMs) {
    browserGetCooldowns.delete(requestKey);
  }
};

const parseRetryAfterMs = (
  response: Response,
  data: unknown
): number | undefined => {
  if (data && typeof data === 'object') {
    const maybeRetryAfterMs = (data as { retryAfterMs?: unknown }).retryAfterMs;
    if (
      typeof maybeRetryAfterMs === 'number' &&
      Number.isFinite(maybeRetryAfterMs) &&
      maybeRetryAfterMs > 0
    ) {
      return Math.floor(maybeRetryAfterMs);
    }
  }

  const retryAfterHeader = response.headers.get('Retry-After');
  if (!retryAfterHeader) {
    return undefined;
  }

  const asSeconds = Number(retryAfterHeader);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return Math.ceil(asSeconds * 1000);
  }

  const targetAtMs = Date.parse(retryAfterHeader);
  if (!Number.isNaN(targetAtMs)) {
    const deltaMs = targetAtMs - Date.now();
    return deltaMs > 0 ? deltaMs : undefined;
  }

  return undefined;
};

const createCooldownError = (
  entry: ApiClientCooldownEntry,
  endpoint: string,
  method: string
): ApiError => {
  const retryAfterMs = Math.max(1, entry.untilMs - Date.now());
  const error = new ApiError(
    entry.message,
    entry.status,
    entry.errorId,
    entry.category,
    entry.suggestedActions,
    retryAfterMs
  );
  error.endpoint = endpoint;
  error.method = method;
  error.payload = { retryAfterMs, source: 'client-cooldown' };
  error.__logged = true;
  return error;
};

const setCooldownEntry = (
  requestKey: string,
  retryAfterMs: number,
  entry: Omit<ApiClientCooldownEntry, 'untilMs'>
): void => {
  if (!isBrowserRuntime() || retryAfterMs <= 0) {
    return;
  }

  browserGetCooldowns.set(requestKey, {
    ...entry,
    untilMs: Date.now() + retryAfterMs,
  });
};

export const resetApiClientGuardState = (): void => {
  browserGetInFlightRequests.clear();
  browserGetCooldowns.clear();
};

export async function apiClient<T>(
  endpoint: string,
  { params, logError = true, timeout = 15000, ...customConfig }: ApiClientOptions = {}
): Promise<T> {
  const isFormData = customConfig.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };

  // Build URL with query parameters
  let url = endpoint;
  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const method = normalizeMethod(customConfig.method, Boolean(customConfig.body));
  const callerSignal = isAbortSignalInstance(customConfig.signal) ? customConfig.signal : undefined;
  const requestAbortController =
    typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  let removeCallerAbortListener: (() => void) | undefined;

  if (callerSignal && requestAbortController) {
    const forwardCallerAbort = (): void => {
      requestAbortController.abort();
    };

    if (callerSignal.aborted) {
      requestAbortController.abort();
    } else {
      callerSignal.addEventListener('abort', forwardCallerAbort, { once: true });
      removeCallerAbortListener = () => {
        callerSignal.removeEventListener('abort', forwardCallerAbort);
      };
    }
  }

  const config = cleanConfig({
    method,
    ...customConfig,
    headers: withCsrfHeaders({
      ...headers,
      'X-Trace-Id': getTraceId(),
      ...customConfig.headers,
    } as Record<string, string>),
  }) as RequestInit;
  if (requestAbortController) {
    config.signal = requestAbortController.signal;
  } else if (callerSignal) {
    config.signal = callerSignal;
  }

  const requestKey = buildRequestKey(method, url);
  const canApplyBrowserGetGuards =
    isBrowserRuntime() && method === 'GET' && !callerSignal;

  clearExpiredCooldown(requestKey, Date.now());
  if (canApplyBrowserGetGuards) {
    const cooldownEntry = browserGetCooldowns.get(requestKey);
    if (cooldownEntry) {
      throw createCooldownError(cooldownEntry, endpoint, method);
    }

    const existingRequest = browserGetInFlightRequests.get(requestKey);
    if (existingRequest) {
      return existingRequest as Promise<T>;
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let bodyTimer: ReturnType<typeof setTimeout> | undefined;
  let didRequestTimeout = false;
  let didBodyTimeout = false;
  const requestAbortSignal = requestAbortController?.signal ?? callerSignal;

  const executeRequest = async (): Promise<T> => {
    const fetchPromise = fetch(url, config);
    const response =
      timeout > 0
        ? await Promise.race<Response>([
            fetchPromise,
            new Promise<Response>((_, reject) => {
              timer = setTimeout(() => {
                didRequestTimeout = true;
                requestAbortController?.abort();
                reject(new Error(`Request timeout after ${timeout}ms`));
              }, timeout);
            }),
          ])
        : await fetchPromise;

    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (response.status === 204) {
      return {} as T;
    }

    const bodyTimeout = Math.max(timeout, 30_000);
    const data: unknown = await Promise.race<unknown>([
      response.text().then<unknown>((text): unknown => {
        if (!text) return null;
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return null;
        }
      }),
      new Promise<never>((_, reject) => {
        bodyTimer = setTimeout(() => {
          didBodyTimeout = true;
          requestAbortController?.abort();
          reject(new Error(`Response body timeout after ${bodyTimeout}ms`));
        }, bodyTimeout);
      }),
    ]);

    if (response.ok) {
      return data as T;
    }

    let errorMessage = response.statusText || 'Unknown API Error';
    let errorId: string | undefined;
    let category: ErrorCategory | string | undefined;
    let suggestedActions: SuggestedAction[] | undefined;

    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      errorMessage = String(dataObj['error'] || dataObj['message'] || errorMessage);
      if (typeof dataObj['errorId'] === 'string') {
        errorId = dataObj['errorId'];
      }
      if (typeof dataObj['category'] === 'string') {
        category = dataObj['category'];
      }
      if (Array.isArray(dataObj['suggestedActions'])) {
        suggestedActions = dataObj['suggestedActions'] as SuggestedAction[];
      }
    }

    const retryAfterMs = parseRetryAfterMs(response, data);
    const error = new ApiError(
      errorMessage,
      response.status,
      errorId,
      category,
      suggestedActions,
      retryAfterMs
    );
    error.payload = data;
    error.endpoint = endpoint;
    error.method = config.method;

    if (canApplyBrowserGetGuards && typeof retryAfterMs === 'number' && retryAfterMs > 0) {
      setCooldownEntry(requestKey, retryAfterMs, {
        message: errorMessage,
        status: response.status,
        errorId,
        category,
        suggestedActions,
      });
    }

    if (logError) {
      const responsePayload =
        data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
      logClientError(error, {
        context: {
          endpoint,
          method: config.method,
          status: response.status,
          traceId: getTraceId(),
          params,
          ...(typeof responsePayload?.['code'] === 'string'
            ? { responseCode: responsePayload['code'] }
            : {}),
          ...(typeof responsePayload?.['errorId'] === 'string'
            ? { responseErrorId: responsePayload['errorId'] }
            : {}),
          ...(typeof responsePayload?.['fingerprint'] === 'string'
            ? { responseFingerprint: responsePayload['fingerprint'] }
            : {}),
          ...(responsePayload && 'details' in responsePayload
            ? { responseDetails: responsePayload['details'] }
            : {}),
          ...(responsePayload ? { responsePayload } : {}),
        },
      });
      if (isLoggableObject(error)) {
        error.__logged = true;
      }
    }

    throw error;
  };

  const wrappedRequest = (async (): Promise<T> => {
    try {
      return await executeRequest();
    } catch (error) {
      if (didRequestTimeout) {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        if (logError) {
          logClientError(timeoutError, {
            context: {
              endpoint,
              method: config.method,
              traceId: getTraceId(),
              params,
            },
          });
          if (isLoggableObject(timeoutError)) {
            timeoutError.__logged = true;
          }
        }
        throw timeoutError;
      }

      if (didBodyTimeout) {
        const bodyTimeout = Math.max(timeout, 30_000);
        const timeoutError = new Error(`Response body timeout after ${bodyTimeout}ms`);
        if (logError) {
          logClientError(timeoutError, {
            context: {
              endpoint,
              method: config.method,
              traceId: getTraceId(),
              params,
            },
          });
          if (isLoggableObject(timeoutError)) {
            timeoutError.__logged = true;
          }
        }
        throw timeoutError;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      if (isAbortLikeError(error, requestAbortSignal ?? config.signal)) {
        if (error instanceof Error) {
          if (error.name !== 'AbortError') {
            const abortError = new Error(error.message);
            abortError.name = 'AbortError';
            throw abortError;
          }
          throw error;
        }

        const abortError = new Error('Request aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }

      const genericError = new Error(error instanceof Error ? error.message : 'Network Error');
      if (logError) {
        logClientError(genericError, {
          context: {
            endpoint,
            method: config.method,
            traceId: getTraceId(),
            params,
          },
        });
        if (isLoggableObject(genericError)) {
          genericError.__logged = true;
        }
      }
      throw genericError;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
      if (bodyTimer) {
        clearTimeout(bodyTimer);
      }
      if (canApplyBrowserGetGuards) {
        browserGetInFlightRequests.delete(requestKey);
      }
      removeCallerAbortListener?.();
    }
  })();

  if (canApplyBrowserGetGuards) {
    browserGetInFlightRequests.set(requestKey, wrappedRequest as Promise<unknown>);
  }

  return await wrappedRequest;
}

export interface Api {
  get: <T>(endpoint: string, options?: ApiClientOptions) => Promise<T>;
  post: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions) => Promise<T>;
  put: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions) => Promise<T>;
  patch: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions) => Promise<T>;
  patchFormData: <T>(endpoint: string, body: FormData, options?: ApiClientOptions) => Promise<T>;
  delete: <T>(endpoint: string, options?: ApiClientOptions) => Promise<T>;
}

export const api: Api = {
  get: <T>(endpoint: string, options?: ApiClientOptions): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patchFormData: <T>(endpoint: string, body: FormData, options?: ApiClientOptions): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: ApiClientOptions): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
