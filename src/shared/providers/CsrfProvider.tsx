'use client';

import { useEffect } from 'react';

import {
  CSRF_HEADER_NAME,
  CSRF_SAFE_METHODS,
  getClientCsrfToken,
  isSameOriginUrl,
} from '@/shared/lib/security/csrf-client';

const isInternalNextRouteRequest = (input: RequestInfo | URL, init?: RequestInit): boolean => {
  const headerSource = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const headers = new Headers(headerSource);

  if (headers.has('next-router-state-tree') || headers.has('next-url') || headers.has('rsc')) {
    return true;
  }

  if (typeof window === 'undefined') return false;
  const origin = window.location.origin;

  try {
    const url =
      typeof input === 'string'
        ? new URL(input, origin)
        : input instanceof URL
          ? input
          : new URL(input.url, origin);
    return url.searchParams.has('_rsc');
  } catch {
    return false;
  }
};

export const CsrfProvider = (): null => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Ensure CSRF cookie is set early so non-fetch uploads (XHR) pass CSRF checks.
    getClientCsrfToken();

    const patched = (window as { __csrfFetchPatched?: boolean }).__csrfFetchPatched;
    if (patched) return;
    (window as { __csrfFetchPatched?: boolean }).__csrfFetchPatched = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (isInternalNextRouteRequest(input, init)) {
        return originalFetch(input, init);
      }

      const baseMethod = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const method = baseMethod.toUpperCase();

      if (!CSRF_SAFE_METHODS.has(method) && isSameOriginUrl(input)) {
        const token = getClientCsrfToken();
        if (token) {
          const existingHeaders =
            init?.headers ?? (input instanceof Request ? input.headers : undefined);
          const headers = new Headers(existingHeaders);
          if (!headers.has(CSRF_HEADER_NAME)) {
            headers.set(CSRF_HEADER_NAME, token);
          }
          if (input instanceof Request && !init) {
            return originalFetch(new Request(input, { headers }));
          }
          return originalFetch(input, { ...init, headers });
        }
      }

      return originalFetch(input, init);
    };
  }, []);

  return null;
};

export default CsrfProvider;
