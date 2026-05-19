import type { HttpResult } from '@/shared/contracts/http';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const DEV_AI_PATHS_INTERNAL_HEADER_VALUE = 'dev-internal-header-value-change-me';
const DEFAULT_API_TIMEOUT_MS = 15_000;

type ApiFetchOptions = RequestInit & { timeoutMs?: number | undefined };

type AbortState = {
  controller: AbortController | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  forwardAbort: (() => void) | null;
  callerSignal: AbortSignal | null;
  didTimeout: () => boolean;
};

type ApiRequestOptions = {
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
};

type ApiFetchErrorLogContext = {
  resolvedUrl: string;
  method: string;
  timeoutMs: number;
  timedOut: boolean;
};

const getEnvValue = (key: string): string | null => {
  const value = process.env[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const createRequestOptions = (options?: ApiRequestOptions): ApiRequestOptions => {
  const requestOptions: ApiRequestOptions = {};
  if (typeof options?.timeoutMs === 'number') {
    requestOptions.timeoutMs = options.timeoutMs;
  }
  if (options?.signal !== undefined) {
    requestOptions.signal = options.signal;
  }
  return requestOptions;
};

export const resolveApiUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (typeof window !== 'undefined') {
    return url;
  }
  const base =
    getEnvValue('NEXT_PUBLIC_APP_URL') ?? getEnvValue('NEXTAUTH_URL') ?? 'http://localhost:3000';
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${trimmedBase}${path}`;
};

const createCallerAbortForwarder = (
  controller: AbortController | null,
  callerSignal: AbortSignal | null | undefined
): (() => void) | null => {
  if (controller === null || callerSignal === undefined || callerSignal === null) {
    return null;
  }
  if (callerSignal.aborted) {
    controller.abort();
    return null;
  }
  const forwardAbort = (): void => {
    controller.abort();
  };
  callerSignal.addEventListener('abort', forwardAbort, { once: true });
  return forwardAbort;
};

const createAbortTimeout = (
  controller: AbortController | null,
  timeoutMs: number,
  onTimeout: () => void
): ReturnType<typeof setTimeout> | null => {
  if (controller === null || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return null;
  }
  return setTimeout(onTimeout, timeoutMs);
};

const createAbortState = (
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number
): AbortState => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timedOut = false;
  const forwardAbort = createCallerAbortForwarder(controller, callerSignal);
  const timeoutId = createAbortTimeout(
    controller,
    timeoutMs,
    (): void => {
      timedOut = true;
      controller?.abort();
    }
  );

  return {
    controller,
    timeoutId,
    forwardAbort,
    callerSignal: callerSignal ?? null,
    didTimeout: () => timedOut,
  };
};

const cleanupAbortState = (state: AbortState): void => {
  if (state.timeoutId !== null) {
    clearTimeout(state.timeoutId);
  }
  if (state.forwardAbort !== null && state.callerSignal !== null) {
    state.callerSignal.removeEventListener('abort', state.forwardAbort);
  }
};

const buildFetchOptions = (fetchOptions: RequestInit, state: AbortState): RequestInit => ({
  ...fetchOptions,
  ...(state.controller !== null ? { signal: state.controller.signal } : {}),
});

const readErrorResponseMessage = async (res: Response): Promise<string> => {
  const errorData = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  if (typeof errorData.error === 'string' && errorData.error.length > 0) {
    return errorData.error;
  }
  if (typeof errorData.message === 'string' && errorData.message.length > 0) {
    return errorData.message;
  }
  return `Request failed with status ${res.status}`;
};

const executeFetch = async <T>(
  resolvedUrl: string,
  fetchOptions: RequestInit,
  state: AbortState
): Promise<HttpResult<T>> => {
  const res = await fetch(resolvedUrl, buildFetchOptions(fetchOptions, state));
  if (res.ok === false) {
    return {
      ok: false,
      error: await readErrorResponseMessage(res),
    };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
};

const handleFetchError = (
  error: unknown,
  context: ApiFetchErrorLogContext
): HttpResult<never> => {
  logClientCatch(error, {
    source: 'ai-paths.api-client',
    action: 'apiFetch',
    url: context.resolvedUrl,
    method: context.method,
    timeoutMs: context.timeoutMs,
    timedOut: context.timedOut,
  });
  if (context.timedOut) {
    return {
      ok: false,
      error: `Request timeout after ${context.timeoutMs}ms`,
    };
  }
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Unknown error occurred',
  };
};

export async function apiFetch<T>(url: string, options?: ApiFetchOptions): Promise<HttpResult<T>> {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, ...fetchOptions } = options ?? {};
  const resolvedUrl = resolveApiUrl(url);
  const abortState = createAbortState(fetchOptions.signal, timeoutMs);

  try {
    return await executeFetch<T>(resolvedUrl, fetchOptions, abortState);
  } catch (error) {
    return handleFetchError(error, {
      resolvedUrl,
      method: fetchOptions.method ?? 'GET',
      timeoutMs,
      timedOut: abortState.didTimeout(),
    });
  } finally {
    cleanupAbortState(abortState);
  }
}

export const generateServerCsrfToken = (): string => {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
};

export const getServerInternalToken = (): string | null => {
  if (typeof window !== 'undefined') return null;
  const configuredToken =
    getEnvValue('AI_PATHS_INTERNAL_TOKEN') ??
    getEnvValue('AUTH_SECRET') ??
    getEnvValue('NEXTAUTH_SECRET');
  if (configuredToken !== null) return configuredToken;
  if (process.env['NODE_ENV'] === 'development') return DEV_AI_PATHS_INTERNAL_HEADER_VALUE;
  return null;
};

export const withApiCsrfHeaders = async (headers?: HeadersInit): Promise<Headers> => {
  if (typeof window === 'undefined') {
    const token = generateServerCsrfToken();
    const next = new Headers(headers);
    if (!next.has('x-csrf-token')) {
      next.set('x-csrf-token', token);
    }
    const cookieValue = `csrf-token=${encodeURIComponent(token)}`;
    const existingCookie = next.get('cookie');
    const nextCookie =
      existingCookie !== null && existingCookie.length > 0
        ? `${existingCookie}; ${cookieValue}`
        : cookieValue;
    next.set('cookie', nextCookie);
    const internalToken = getServerInternalToken();
    if (internalToken !== null && internalToken.length > 0 && !next.has('x-ai-paths-internal')) {
      next.set('x-ai-paths-internal', internalToken);
    }
    return next;
  }
  const { withCsrfHeaders } = await import('@/shared/lib/security/csrf-client');
  return withCsrfHeaders(headers);
};

export async function apiPost<T>(
  url: string,
  body: unknown,
  options?: ApiRequestOptions
): Promise<HttpResult<T>> {
  const headers = await withApiCsrfHeaders({ 'Content-Type': 'application/json' });
  return apiFetch<T>(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...createRequestOptions(options),
  });
}

export async function apiPatch<T>(
  url: string,
  body: unknown,
  options?: ApiRequestOptions
): Promise<HttpResult<T>> {
  const headers = await withApiCsrfHeaders({ 'Content-Type': 'application/json' });
  return apiFetch<T>(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
    ...createRequestOptions(options),
  });
}

export async function apiDelete<T>(
  url: string,
  options?: ApiRequestOptions
): Promise<HttpResult<T>> {
  const headers = await withApiCsrfHeaders();
  return apiFetch<T>(url, {
    method: 'DELETE',
    headers,
    ...createRequestOptions(options),
  });
}
