'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  KANGUR_BASE_PATH,
} from '@/features/kangur/config/routing';
import {
  type KangurRouteTransitionKind,
  useOptionalKangurRouteTransitionActions,
  useOptionalKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  isManagedLocalHref,
  normalizeManagedKangurPathname,
  resolveManagedKangurPageKeyFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
type KangurRouteNavigationOptions = {
  pageKey?: string | null;
  scroll?: boolean;
  sourceId?: string | null;
  acknowledgeMs?: number;
  transitionKind?: KangurRouteTransitionKind | null;
};

type KangurBackNavigationOptions = Pick<
  KangurRouteNavigationOptions,
  'acknowledgeMs' | 'pageKey' | 'scroll' | 'sourceId'
> & {
  fallbackHref?: string | null;
  fallbackPageKey?: string | null;
};

const getManagedPathnameFromHref = (href: string): string | null => {
  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'parse-managed-path',
      description: 'Parses managed Kangur hrefs into normalized pathnames.',
      context: { href },
    },
    () => normalizeManagedKangurPathname(new URL(href, 'https://kangur.local').pathname),
    { fallback: normalizeManagedKangurPathname(href) }
  );
};

let queuedManagedNavigationTimeoutId: number | null = null;

const clearQueuedManagedNavigation = (): void => {
  if (queuedManagedNavigationTimeoutId === null || typeof window === 'undefined') {
    return;
  }

  window.clearTimeout(queuedManagedNavigationTimeoutId);
  queuedManagedNavigationTimeoutId = null;
};

export function useKangurRouteNavigator(): {
  back: (options?: KangurBackNavigationOptions) => void;
  prefetch: (href: string) => void;
  push: (href: string, options?: KangurRouteNavigationOptions) => void;
  replace: (href: string, options?: KangurRouteNavigationOptions) => void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const routeTransitionActions = useOptionalKangurRouteTransitionActions();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const routing = useOptionalKangurRouting();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const requestedHref = routing?.requestedHref ?? routing?.requestedPath;

  const startManagedTransition = useCallback(
    (
      href: string | null,
      {
        acknowledgeMs,
        pageKey,
        sourceId,
        transitionKind,
      }: Pick<
        KangurRouteNavigationOptions,
        'acknowledgeMs' | 'pageKey' | 'sourceId' | 'transitionKind'
      > = {}
    ): { acknowledgeMs: number; started: boolean } => {
      if (!routeTransitionActions || (href !== null && !isManagedLocalHref(href))) {
        return {
          acknowledgeMs: 0,
          started: true,
        };
      }

      const targetPathname = href ? getManagedPathnameFromHref(href) : null;
      const currentPathname = normalizeManagedKangurPathname(pathname);
      const normalizedRequestedHref = normalizeManagedKangurPathname(requestedHref);

      if (
        href &&
        routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
        targetPathname &&
        currentPathname &&
        targetPathname !== currentPathname &&
        normalizedRequestedHref === currentPathname
      ) {
        return {
          acknowledgeMs: 0,
          started: true,
        };
      }

      if (
        href &&
        normalizedRequestedHref &&
        href === requestedHref &&
        targetPathname &&
        currentPathname &&
        targetPathname !== currentPathname
      ) {
        return {
          acknowledgeMs: 0,
          started: true,
        };
      }

      const resolvedPageKey =
        pageKey ?? (href ? resolveManagedKangurPageKeyFromHref(href, basePath) : null);
      const transitionResult = routeTransitionActions.startRouteTransition({
        ...(href ? { href } : {}),
        ...(resolvedPageKey ? { pageKey: resolvedPageKey } : {}),
        ...(sourceId?.trim() ? { sourceId: sourceId.trim() } : {}),
        ...(typeof acknowledgeMs === 'number' && acknowledgeMs > 0 ? { acknowledgeMs } : {}),
        ...(transitionKind ? { transitionKind } : {}),
      });

      if (
        transitionResult &&
        typeof transitionResult === 'object' &&
        'started' in transitionResult &&
        'acknowledgeMs' in transitionResult
      ) {
        return transitionResult;
      }

      return {
        acknowledgeMs: 0,
        started: true,
      };
    },
    [basePath, pathname, requestedHref, routeTransitionActions, routeTransitionState]
  );

  const clearQueuedNavigation = useCallback((): void => {
    clearQueuedManagedNavigation();
  }, []);

  const scheduleManagedNavigation = useCallback(
    (acknowledgeMs: number, navigate: () => void): boolean => {
      if (acknowledgeMs <= 0 || typeof window === 'undefined') {
        return false;
      }

      clearQueuedNavigation();
      queuedManagedNavigationTimeoutId = window.setTimeout(() => {
        queuedManagedNavigationTimeoutId = null;
        navigate();
      }, acknowledgeMs);

      return true;
    },
    [clearQueuedNavigation]
  );

  const prefetch = useCallback(
    (href: string): void => {
      if (!isManagedLocalHref(href) || typeof router.prefetch !== 'function') {
        return;
      }

      router.prefetch(href);
    },
    [router]
  );

  const push = useCallback(
    (href: string, options: KangurRouteNavigationOptions = {}): void => {
      const transitionResult = startManagedTransition(href, options);
      if (!transitionResult.started) {
        return;
      }

      const performPush = (): void => {
        router.push(href, {
          scroll: options.scroll ?? false,
        });
      };

      if (scheduleManagedNavigation(transitionResult.acknowledgeMs, performPush)) {
        return;
      }

      performPush();
    },
    [router, scheduleManagedNavigation, startManagedTransition]
  );

  const replace = useCallback(
    (href: string, options: KangurRouteNavigationOptions = {}): void => {
      const transitionResult = startManagedTransition(href, options);
      if (!transitionResult.started) {
        return;
      }

      const performReplace = (): void => {
        router.replace(href, {
          scroll: options.scroll ?? false,
        });
      };

      if (scheduleManagedNavigation(transitionResult.acknowledgeMs, performReplace)) {
        return;
      }

      performReplace();
    },
    [router, scheduleManagedNavigation, startManagedTransition]
  );

  const back = useCallback(
    (options: KangurBackNavigationOptions = {}): void => {
      const fallbackHref =
        typeof options.fallbackHref === 'string' && options.fallbackHref.trim().length > 0
          ? options.fallbackHref.trim()
          : null;

      if (typeof window === 'undefined' || window.history.length <= 1) {
        if (!fallbackHref) {
          return;
        }

        push(fallbackHref, {
          acknowledgeMs: options.acknowledgeMs,
          pageKey: options.fallbackPageKey ?? options.pageKey ?? null,
          scroll: options.scroll,
          sourceId: options.sourceId,
        });
        return;
      }

      const transitionResult = startManagedTransition(null, options);
      if (!transitionResult.started) {
        return;
      }

      const performBack = (): void => {
        window.history.back();
      };

      if (scheduleManagedNavigation(transitionResult.acknowledgeMs, performBack)) {
        return;
      }

      performBack();
    },
    [push, scheduleManagedNavigation, startManagedTransition]
  );

  return useMemo(
    () => ({
      back,
      prefetch,
      push,
      replace,
    }),
    [back, prefetch, push, replace]
  );
}
