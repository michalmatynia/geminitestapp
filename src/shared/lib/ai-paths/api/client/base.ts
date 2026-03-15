import type { HttpResult } from '@/shared/contracts/http';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const resolveApiUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (typeof window !== 'undefined') {
    return url;
  }
  const base =
    process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${trimmedBase}${path}`;
};

export async function apiFetch<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number | undefined }
): Promise<HttpResult<T>> {
  const { timeoutMs = 15000, ...fetchOptions } = options ?? {};
  const callerSignal = fetchOptions.signal;
  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  let forwardAbort: (() => void) | null = null;

  if (abortController && callerSignal) {
    if (callerSignal.aborted) {
      abortController.abort();
    } else {
      forwardAbort = (): void => {
        abortController.abort();
      };
      callerSignal.addEventListener('abort', forwardAbort, { once: true });
    }
  }

  if (abortController && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout((): void => {
      timedOut = true;
      abortController.abort();
    }, timeoutMs);
  }

  try {
    const resolvedUrl = resolveApiUrl(url);
    const res = await fetch(resolvedUrl, {
      ...fetchOptions,
      ...(abortController ? { signal: abortController.signal } : {}),
    });
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      return {
        ok: false,
        error: errorData.error || errorData.message || `Request failed with status ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (error) {
    logClientError(error);
    if (timedOut) {
      return {
        ok: false,
        error: `Request timeout after ${timeoutMs}ms`,
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (forwardAbort && callerSignal) {
      callerSignal.removeEventListener('abort', forwardAbort);
    }
  }
}

export const generateServerCsrfToken = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export const getServerInternalToken = (): string | null => {
  if (typeof window !== 'undefined') return null;
  if (process.env['AI_PATHS_INTERNAL_TOKEN']) return process.env['AI_PATHS_INTERNAL_TOKEN'];
  if (process.env['AUTH_SECRET']) return process.env['AUTH_SECRET'];
  if (process.env['NEXTAUTH_SECRET']) return process.env['NEXTAUTH_SECRET'];
  if (process.env['NODE_ENV'] === 'development') return 'dev-secret-change-me';
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
    next.set('cookie', existingCookie ? `${existingCookie}; ${cookieValue}` : cookieValue);
    const internalToken = getServerInternalToken();
    if (internalToken && !next.has('x-ai-paths-internal')) {
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
  options?: { timeoutMs?: number | undefined; signal?: AbortSignal | undefined }
): Promise<HttpResult<T>> {
  const headers = await withApiCsrfHeaders({ 'Content-Type': 'application/json' });
  return apiFetch<T>(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}

export async function apiPatch<T>(
  url: string,
  body: unknown,
  options?: { timeoutMs?: number | undefined; signal?: AbortSignal | undefined }
): Promise<HttpResult<T>> {
  const headers = await withApiCsrfHeaders({ 'Content-Type': 'application/json' });
  return apiFetch<T>(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
    ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}

export async function apiDelete<T>(
  url: string,
  options?: { timeoutMs?: number | undefined; signal?: AbortSignal | undefined }
): Promise<HttpResult<T>> {
  const headers = await withApiCsrfHeaders();
  return apiFetch<T>(url, {
    method: 'DELETE',
    headers,
    ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
}
