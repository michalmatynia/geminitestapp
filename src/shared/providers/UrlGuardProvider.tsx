'use client';

import { useEffect } from 'react';

import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

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

type MutableMethodTarget = {
  descriptor: PropertyDescriptor;
  target: object;
};

const resolveMutableMethodTarget = (
  instance: object,
  method: string
): MutableMethodTarget | null => {
  const ownDescriptor = Object.getOwnPropertyDescriptor(instance, method);
  if (ownDescriptor) {
    if (ownDescriptor.writable || ownDescriptor.configurable) {
      return { target: instance, descriptor: ownDescriptor };
    }
    return null;
  }

  const prototype = Object.getPrototypeOf(instance) as object | null;
  if (!prototype) return null;

  const prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, method);
  if (!prototypeDescriptor) return null;
  if (!prototypeDescriptor.writable && !prototypeDescriptor.configurable) {
    return null;
  }

  return {
    target: prototype,
    descriptor: prototypeDescriptor,
  };
};

const overrideMethod = <TMethod extends (...args: never[]) => unknown>(
  instance: object,
  method: string,
  replacement: TMethod
): (() => void) | null => {
  const resolved = resolveMutableMethodTarget(instance, method);
  if (!resolved) return null;

  Object.defineProperty(resolved.target, method, {
    ...resolved.descriptor,
    value: replacement,
  });

  return (): void => {
    Object.defineProperty(resolved.target, method, resolved.descriptor);
  };
};

export function UrlGuardProvider(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.host;
    const hostPrefix = `/${host}`;
    const restoreCallbacks: Array<() => void> = [];

    const normalizedPath = normalizeBadHostPath(host, window.location.pathname);
    if (normalizedPath) {
      const nextUrl = `${normalizedPath}${window.location.search}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);

      logClientError(new Error('Normalized path'), {
        context: {
          source: 'UrlGuardProvider',
          from: window.location.pathname,
          to: normalizedPath,
          level: 'info',
        },
      });
    }

    const wrap = (
      original: (url: string, ...rest: unknown[]) => void
    ): ((url: string, ...rest: unknown[]) => void) => {
      return (url: string, ...rest: unknown[]): void => {
        const next = normalizeNavigationUrl(url, host);
        if (next.startsWith(hostPrefix) || next.startsWith(`//${host}`)) {
          logClientError(new Error('Blocked invalid navigation'), {
            context: {
              source: 'UrlGuardProvider',
              url,
              normalized: next,
              stack: new Error().stack,
              level: 'warn',
            },
          });
        }
        original(next, ...rest);
      };
    };

    try {
      const originalAssign = window.location.assign.bind(window.location);
      const originalReplace = window.location.replace.bind(window.location);

      const restoreAssign = overrideMethod(window.location, 'assign', wrap(originalAssign));
      const restoreReplace = overrideMethod(window.location, 'replace', wrap(originalReplace));

      if (restoreAssign) restoreCallbacks.push(restoreAssign);
      if (restoreReplace) restoreCallbacks.push(restoreReplace);
    } catch (error) {
      logClientCatch(error, {
        source: 'UrlGuardProvider',
        action: 'overrideLocationNavigation',
        level: 'warn',
      });

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
            logClientError(new Error(`${label} invalid`), {
              context: {
                source: 'UrlGuardProvider',
                url,
                normalized: next,
                stack: new Error().stack,
                level: 'warn',
              },
            });
          }
          original.call(window.history, data, title, next);
          return;
        }
        original.call(window.history, data, title, url as string | URL | null);
      };
    };

    try {
      const originalPush = window.history.pushState.bind(window.history);
      const originalReplaceState = window.history.replaceState.bind(window.history);

      const restorePushState = overrideMethod(
        window.history,
        'pushState',
        wrapHistory(originalPush, 'pushState')
      );
      const restoreReplaceState = overrideMethod(
        window.history,
        'replaceState',
        wrapHistory(originalReplaceState, 'replaceState')
      );

      if (restorePushState) restoreCallbacks.push(restorePushState);
      if (restoreReplaceState) restoreCallbacks.push(restoreReplaceState);
    } catch (error) {
      logClientCatch(error, {
        source: 'UrlGuardProvider',
        action: 'overrideHistoryNavigation',
        level: 'warn',
      });

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
        logClientError(new Error('Normalized anchor'), {
          context: {
            source: 'UrlGuardProvider',
            href,
            normalized,
            stack: new Error().stack,
            level: 'info',
          },
        });
        anchor.setAttribute('href', normalized);
      }
    };
    window.addEventListener('click', onClick, true);

    return (): void => {
      window.removeEventListener('click', onClick, true);
      for (const restore of restoreCallbacks.reverse()) {
        restore();
      }
    };
  }, []);

  return null;
}
