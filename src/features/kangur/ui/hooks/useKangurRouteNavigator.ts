'use client';

import { useLocale } from 'next-intl';
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
import {
  buildLocalizedPathname,
  getPathLocale,
  normalizeSiteLocale,
  stripSiteLocalePrefix,
} from '@/shared/lib/i18n/site-locale';

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

const localizeManagedHref = ({
  href,
  locale,
  pathname,
}: {
  href: string;
  locale: string;
  pathname: string | null;
}): string => {
  if (!isManagedLocalHref(href)) {
    return href;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'localize-managed-href',
      description: 'Localizes managed Kangur hrefs to the active route locale.',
      context: {
        href,
        locale,
        pathname,
      },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      const hrefLocale = getPathLocale(parsed.pathname);
      if (hrefLocale) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      const explicitPathLocale = getPathLocale(pathname);
      const normalizedPathname = stripSiteLocalePrefix(parsed.pathname);
      const normalizedCurrentPathname = stripSiteLocalePrefix(pathname);
      if (explicitPathLocale && normalizedCurrentPathname === normalizedPathname) {
        return `${normalizedPathname}${parsed.search}${parsed.hash}`;
      }

      const localizedPathname = explicitPathLocale
        ? normalizedPathname === '/'
          ? `/${explicitPathLocale}`
          : `/${explicitPathLocale}${normalizedPathname}`
        : buildLocalizedPathname(normalizedPathname, normalizeSiteLocale(locale));

      return `${localizedPathname}${parsed.search}${parsed.hash}`;
    },
    { fallback: href }
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
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const routeTransitionActions = useOptionalKangurRouteTransitionActions();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const routing = useOptionalKangurRouting();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const requestedHref = routing?.requestedHref ?? routing?.requestedPath;
  const resolveManagedHref = useCallback(
    (href: string): string =>
      localizeManagedHref({
        href,
        locale,
        pathname,
      }),
    [locale, pathname]
  );

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
        routeTransitionState &&
        routeTransitionState.transitionPhase !== 'idle' &&
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

      const resolvedHref = href ? resolveManagedHref(href) : null;
      const resolvedPageKey =
        pageKey ??
        (resolvedHref ? resolveManagedKangurPageKeyFromHref(resolvedHref, basePath) : null);
      const transitionResult = routeTransitionActions.startRouteTransition({
        ...(resolvedHref ? { href: resolvedHref } : {}),
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
    [basePath, pathname, requestedHref, resolveManagedHref, routeTransitionActions, routeTransitionState]
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

      router.prefetch(resolveManagedHref(href));
    },
    [resolveManagedHref, router]
  );

  const push = useCallback(
    (href: string, options: KangurRouteNavigationOptions = {}): void => {
      const resolvedHref = resolveManagedHref(href);
      const transitionResult = startManagedTransition(resolvedHref, options);
      if (!transitionResult.started) {
        return;
      }

      const performPush = (): void => {
        router.push(resolvedHref, {
          scroll: options.scroll ?? false,
        });
      };

      if (scheduleManagedNavigation(transitionResult.acknowledgeMs, performPush)) {
        return;
      }

      performPush();
    },
    [resolveManagedHref, router, scheduleManagedNavigation, startManagedTransition]
  );

  const replace = useCallback(
    (href: string, options: KangurRouteNavigationOptions = {}): void => {
      const resolvedHref = resolveManagedHref(href);
      const transitionResult = startManagedTransition(resolvedHref, options);
      if (!transitionResult.started) {
        return;
      }

      const performReplace = (): void => {
        router.replace(resolvedHref, {
          scroll: options.scroll ?? false,
        });
      };

      if (scheduleManagedNavigation(transitionResult.acknowledgeMs, performReplace)) {
        return;
      }

      performReplace();
    },
    [resolveManagedHref, router, scheduleManagedNavigation, startManagedTransition]
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
