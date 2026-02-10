'use client';

import { useEffect } from 'react';
import { logClientError } from '@/features/observability';

const normalizeBadHostPath = (host: string, path: string): string | null => {
  const hostPrefix = `/${host}`;
  if (path === hostPrefix) return '/';
  if (path.startsWith(`${hostPrefix}/`)) {
    const next = path.slice(hostPrefix.length);
    return next.length ? next : '/';
  }
  return null;
};

const normalizeNavigationUrl = (input: string, host: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  if (trimmed.startsWith(`//${host}`)) {
    return `${window.location.protocol}${trimmed}`;
  }
  if (trimmed === host || trimmed === `${host}/`) {
    return window.location.origin;
  }
  if (trimmed.startsWith(`${host}/`)) {
    return `${window.location.protocol}//${trimmed}`;
  }
  if (trimmed.startsWith(`/${host}`)) {
    const normalized = normalizeBadHostPath(host, trimmed);
    return normalized ?? trimmed;
  }
  return trimmed;
};

export function UrlGuardProvider(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.host;
    const hostPrefix = `/${host}`;

    const normalizedPath = normalizeBadHostPath(host, window.location.pathname);
    if (normalizedPath) {
      const nextUrl = `${normalizedPath}${window.location.search}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
       
      logClientError(new Error('Normalized path'), { context: { source: 'UrlGuardProvider', from: window.location.pathname, to: normalizedPath, level: 'info' } });
    }

    const wrap = (original: (url: string, ...rest: unknown[]) => void): ((url: string, ...rest: unknown[]) => void) => {
      return (url: string, ...rest: unknown[]): void => {
        const next = normalizeNavigationUrl(url, host);
        if (next.startsWith(hostPrefix) || next.startsWith(`//${host}`)) {
           
          logClientError(new Error('Blocked invalid navigation'), { context: { source: 'UrlGuardProvider', url, normalized: next, stack: new Error().stack, level: 'warn' } });
        }
        original(next, ...rest);
      };
    };

    try {
      const originalAssign = window.location.assign.bind(window.location);
      const originalReplace = window.location.replace.bind(window.location);
      window.location.assign = wrap(originalAssign);
      window.location.replace = wrap(originalReplace);
    } catch {
      // Ignore if location is not writable in this environment.
    }

    const wrapHistory = (
      original: (data: unknown, title: string, url?: string | URL | null) => void,
      label: string
    ): ((data: unknown, title: string, url?: string | URL | null) => void) => {
      return (data: unknown, title: string, url?: string | URL | null): void => {
        if (typeof url === 'string') {
          const next = normalizeNavigationUrl(url, host);
          if (next.startsWith(hostPrefix) || next.startsWith(`//${host}`)) {
             
            logClientError(new Error(`${label} invalid`), { context: { source: 'UrlGuardProvider', url, normalized: next, stack: new Error().stack, level: 'warn' } });
          }
          original.call(window.history, data, title, next); return;
        }
        original.call(window.history, data, title, url as string | URL | null);
      };
    };

    try {
      const originalPush = window.history.pushState.bind(window.history);
      const originalReplaceState = window.history.replaceState.bind(window.history);
      window.history.pushState = wrapHistory(originalPush, 'pushState');
      window.history.replaceState = wrapHistory(originalReplaceState, 'replaceState');
    } catch {
      // Ignore history patch failures.
    }

    const onClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const normalized = normalizeNavigationUrl(href, host);
      if (normalized !== href) {
         
        logClientError(new Error('Normalized anchor'), { context: { source: 'UrlGuardProvider', href, normalized, stack: new Error().stack, level: 'info' } });
        anchor.setAttribute('href', normalized);
      }
    };
    window.addEventListener('click', onClick, true);

    return (): void => {
      window.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}
