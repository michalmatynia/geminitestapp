'use client';

import { useEffect } from 'react';

import {
  CSRF_HEADER_NAME,
  CSRF_SAFE_METHODS,
  getClientCsrfToken,
  isSameOriginUrl,
} from '@/shared/lib/security/csrf-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type CsrfFetchWindow = Window &
  typeof globalThis & {
    __csrfFetchPatched?: boolean;
    __csrfOriginalFetch?: typeof fetch;
  };

const resolveRequestHeaders = (input: RequestInfo | URL, init?: RequestInit): Headers => {
  const headerSource = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  return new Headers(headerSource);
};

const resolveRequestUrl = (input: RequestInfo | URL, origin: string): URL => {
  if (typeof input === 'string') {
    return new URL(input, origin);
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url, origin);
};

const hasInternalNextHeaders = (headers: Headers): boolean =>
  headers.has('next-router-state-tree') || headers.has('next-url') || headers.has('rsc');

const isInternalNextRouteRequest = (input: RequestInfo | URL, init?: RequestInit): boolean => {
  const headers = resolveRequestHeaders(input, init);

  if (hasInternalNextHeaders(headers)) {
    return true;
  }

  if (typeof window === 'undefined') return false;
  const origin = window.location.origin;

  try {
    const url = resolveRequestUrl(input, origin);
    return url.searchParams.has('_rsc');
  } catch (error) {
    logClientCatch(error, {
      source: 'CsrfProvider',
      action: 'isInternalNextRouteRequest',
      level: 'warn',
    });
    return false;
  }
};

export const shouldInstallGlobalCsrfFetchPatch = (
  nodeEnv = process.env['NODE_ENV'],
  enableInDevelopment = process.env['NEXT_PUBLIC_ENABLE_CSRF_FETCH_PATCH']
): boolean => {
  if (nodeEnv !== 'development') return true;
  return enableInDevelopment === 'true';
};

const hasUsableCsrfToken = (token: string | null): token is string =>
  typeof token === 'string' && token.length > 0;

const resolveRequestMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  const baseMethod = init?.method ?? (input instanceof Request ? input.method : 'GET');
  return baseMethod.toUpperCase();
};

const shouldAttachCsrfHeader = (input: RequestInfo | URL, method: string): boolean =>
  !CSRF_SAFE_METHODS.has(method) && isSameOriginUrl(input);

const buildCsrfHeaders = (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  token: string
): Headers => {
  const headers = resolveRequestHeaders(input, init);
  if (!headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  return headers;
};

const fetchWithCsrf = (
  originalFetch: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const method = resolveRequestMethod(input, init);
  if (!shouldAttachCsrfHeader(input, method)) {
    return originalFetch(input, init);
  }

  const token = getClientCsrfToken();
  if (!hasUsableCsrfToken(token)) {
    return originalFetch(input, init);
  }

  const headers = buildCsrfHeaders(input, init, token);
  if (input instanceof Request && init === undefined) {
    return originalFetch(new Request(input, { headers }));
  }
  return originalFetch(input, { ...init, headers });
};

const createCsrfFetch =
  (originalFetch: typeof fetch): typeof fetch =>
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (isInternalNextRouteRequest(input, init)) {
      return originalFetch(input, init);
    }
    return fetchWithCsrf(originalFetch, input, init);
  };

export const CsrfProvider = (): null => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Ensure CSRF cookie is set early so non-fetch uploads (XHR) pass CSRF checks.
    getClientCsrfToken();

    const csrfWindow = window as CsrfFetchWindow;
    if (!shouldInstallGlobalCsrfFetchPatch()) {
      if (
        csrfWindow.__csrfFetchPatched === true &&
        typeof csrfWindow.__csrfOriginalFetch === 'function'
      ) {
        window.fetch = csrfWindow.__csrfOriginalFetch;
        csrfWindow.__csrfFetchPatched = false;
      }
      return;
    }

    const patched = csrfWindow.__csrfFetchPatched;
    if (patched === true) return;
    csrfWindow.__csrfFetchPatched = true;

    const originalFetch = csrfWindow.__csrfOriginalFetch ?? window.fetch.bind(window);
    csrfWindow.__csrfOriginalFetch = originalFetch;
    window.fetch = createCsrfFetch(originalFetch);
  }, []);

  return null;
};

export default CsrfProvider;
