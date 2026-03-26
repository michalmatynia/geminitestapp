'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  KANGUR_BASE_PATH,
} from '@/features/kangur/config/routing';
import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import {
  type KangurRouteTransitionKind,
  useOptionalKangurRouteTransitionActions,
  useOptionalKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  canonicalizeKangurPublicAliasHref,
  isManagedLocalHref,
  localizeManagedKangurHref,
  normalizeManagedKangurPathname,
  resolveAccessibleManagedKangurPageKeyFromHref,
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

const KANGUR_COARSE_POINTER_QUERY = '(pointer: coarse)';
const KANGUR_HOVER_NONE_QUERY = '(hover: none)';

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

const shouldBypassManagedNavigationAcknowledge = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const matchesCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY).matches
      : false;

  if (matchesCoarsePointer) {
    return true;
  }

  const maxTouchPoints =
    typeof navigator === 'undefined' ? 0 : Math.max(navigator.maxTouchPoints ?? 0, 0);
  const prefersTouchOnlyInteraction =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_HOVER_NONE_QUERY).matches
      : false;

  return maxTouchPoints > 0 && prefersTouchOnlyInteraction;
};

const resolveEffectiveManagedAcknowledgeMs = (acknowledgeMs?: number | null): number => {
  if (!Number.isFinite(acknowledgeMs)) {
    return 0;
  }

  const normalizedAcknowledgeMs = Math.max(0, Math.round(acknowledgeMs ?? 0));
  if (normalizedAcknowledgeMs === 0) {
    return 0;
  }

  return shouldBypassManagedNavigationAcknowledge() ? 0 : normalizedAcknowledgeMs;
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
  const { data: session } = useOptionalNextAuthSession();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const currentAccessiblePageKey = routing?.pageKey ?? 'Game';
  const effectivePageKeyBasePath = frontendPublicOwner?.publicOwner === 'kangur' ? '/' : basePath;
  const requestedHref = routing?.requestedHref ?? routing?.requestedPath;
  const resolveManagedHref = useCallback(
    (href: string, transitionKind?: KangurRouteTransitionKind | null): string => {
      const localizedHref = localizeManagedKangurHref({
        href,
        locale,
        pathname,
        transitionKind,
      });

      return frontendPublicOwner?.publicOwner === 'kangur'
        ? canonicalizeKangurPublicAliasHref(localizedHref)
        : localizedHref;
    },
    [frontendPublicOwner?.publicOwner, locale, pathname]
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
      const effectiveAcknowledgeMs = resolveEffectiveManagedAcknowledgeMs(acknowledgeMs);

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

      const resolvedHref = href ? resolveManagedHref(href, transitionKind) : null;
      const accessibleResolvedPageKey = pageKey
        ? resolveAccessibleKangurPageKey(pageKey, session, currentAccessiblePageKey)
        : resolvedHref
          ? resolveAccessibleManagedKangurPageKeyFromHref({
              href: resolvedHref,
              basePath: effectivePageKeyBasePath,
              session,
              fallbackPageKey: currentAccessiblePageKey,
            })
          : currentAccessiblePageKey;
      const transitionResult = routeTransitionActions.startRouteTransition({
        ...(resolvedHref ? { href: resolvedHref } : {}),
        ...(accessibleResolvedPageKey ? { pageKey: accessibleResolvedPageKey } : {}),
        ...(sourceId?.trim() ? { sourceId: sourceId.trim() } : {}),
        ...(effectiveAcknowledgeMs > 0 ? { acknowledgeMs: effectiveAcknowledgeMs } : {}),
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
    [
      effectivePageKeyBasePath,
      currentAccessiblePageKey,
      pathname,
      requestedHref,
      resolveManagedHref,
      session,
      routeTransitionActions,
      routeTransitionState,
    ]
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
      const resolvedHref = resolveManagedHref(href, options.transitionKind);
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
      const resolvedHref = resolveManagedHref(href, options.transitionKind);
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

      const fallbackTransitionPageKey = options.fallbackPageKey ?? options.pageKey ?? null;
      const transitionResult = startManagedTransition(null, {
        ...options,
        pageKey: fallbackTransitionPageKey,
      });
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
