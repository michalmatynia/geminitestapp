'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
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
  resolveManagedKangurBasePath,
} from '@/features/kangur/ui/routing/managed-paths';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';

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

type KangurRouteTransitionStateSnapshot = {
  transitionPhase?: string | null;
};

type KangurRouteTransitionActionsSnapshot = {
  startRouteTransition: (input: Record<string, unknown>) => unknown;
};

type KangurManagedTransitionResult = {
  acknowledgeMs: number;
  started: boolean;
};

type KangurManagedTransitionOptions = Pick<
  KangurRouteNavigationOptions,
  'acknowledgeMs' | 'pageKey' | 'sourceId' | 'transitionKind'
>;

type KangurManagedTransitionPathSnapshot = {
  currentPathname: string | null;
  normalizedRequestedHref: string | null;
  targetPathname: string | null;
};

type KangurRoutingSnapshot = {
  basePath?: string | null;
  pageKey?: string | null;
  requestedHref?: string | null;
  requestedPath?: string | null;
};

type KangurRouteTransitionPayloadInput = {
  accessibleResolvedPageKey: string | null;
  effectiveAcknowledgeMs: number;
  resolvedHref: string | null;
  sourceId?: string | null;
  transitionKind?: KangurRouteTransitionKind | null;
};

const KANGUR_COARSE_POINTER_QUERY = '(pointer: coarse)';
const KANGUR_HOVER_NONE_QUERY = '(hover: none)';
const KANGUR_STARTED_TRANSITION_FALLBACK: KangurManagedTransitionResult = {
  acknowledgeMs: 0,
  started: true,
};

const resolveKangurNavigatorBasePath = (routing?: KangurRoutingSnapshot | null): string =>
  routing?.basePath ?? KANGUR_BASE_PATH;

const resolveKangurNavigatorPageKey = (routing?: KangurRoutingSnapshot | null): string =>
  routing?.pageKey ?? 'Game';

const resolveKangurNavigatorRequestedHref = (
  routing?: KangurRoutingSnapshot | null
): string | null => routing?.requestedHref ?? routing?.requestedPath ?? null;

const resolveKangurNavigatorState = (routing?: KangurRoutingSnapshot | null) => ({
  basePath: resolveKangurNavigatorBasePath(routing),
  currentAccessiblePageKey: resolveKangurNavigatorPageKey(routing),
  requestedHref: resolveKangurNavigatorRequestedHref(routing),
});

const resolveKangurFrontendPublicOwner = (
  frontendPublicOwner?: { publicOwner?: string | null } | null
): string | null => frontendPublicOwner?.publicOwner ?? null;

const resolveManagedNavigatorHref = ({
  frontendPublicOwner,
  href,
  locale,
  pathname,
  transitionKind,
}: {
  frontendPublicOwner?: string | null;
  href: string;
  locale: string;
  pathname: string;
  transitionKind?: KangurRouteTransitionKind | null;
}): string => {
  const localizedHref = localizeManagedKangurHref({
    href,
    locale,
    pathname,
    transitionKind,
  });
  return frontendPublicOwner === 'kangur'
    ? canonicalizeKangurPublicAliasHref(localizedHref)
    : localizedHref;
};

const getManagedPathnameFromHref = (href: string): string | null =>
  withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'parse-managed-path',
      description: 'Parses managed Kangur hrefs into normalized pathnames.',
      context: { href },
    },
    () => normalizeManagedKangurPathname(new URL(href, 'https://kangur.local').pathname),
    { fallback: normalizeManagedKangurPathname(href) }
  );

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

const canStartManagedRouteTransition = (
  routeTransitionActions: KangurRouteTransitionActionsSnapshot | null | undefined,
  href: string | null
): routeTransitionActions is KangurRouteTransitionActionsSnapshot =>
  Boolean(routeTransitionActions) && (href === null || isManagedLocalHref(href));

const resolveManagedTransitionPathSnapshot = (
  href: string | null,
  pathname: string,
  requestedHref?: string | null
): KangurManagedTransitionPathSnapshot => ({
  currentPathname: normalizeManagedKangurPathname(pathname),
  normalizedRequestedHref: normalizeManagedKangurPathname(requestedHref),
  targetPathname: href ? getManagedPathnameFromHref(href) : null,
});

const shouldBypassPendingManagedTransition = ({
  href,
  routeTransitionState,
  snapshot,
}: {
  href: string | null;
  routeTransitionState?: KangurRouteTransitionStateSnapshot | null;
  snapshot: KangurManagedTransitionPathSnapshot;
}): boolean => {
  if (!href || !routeTransitionState || routeTransitionState.transitionPhase === 'idle') {
    return false;
  }
  if (!snapshot.targetPathname || !snapshot.currentPathname) {
    return false;
  }
  return (
    snapshot.targetPathname !== snapshot.currentPathname &&
    snapshot.normalizedRequestedHref === snapshot.currentPathname
  );
};

const shouldBypassRequestedHrefManagedTransition = ({
  href,
  requestedHref,
  snapshot,
}: {
  href: string | null;
  requestedHref?: string | null;
  snapshot: KangurManagedTransitionPathSnapshot;
}): boolean => {
  if (!href || !snapshot.normalizedRequestedHref || href !== requestedHref) {
    return false;
  }
  if (!snapshot.targetPathname || !snapshot.currentPathname) {
    return false;
  }
  return snapshot.targetPathname !== snapshot.currentPathname;
};

const buildManagedRouteTransitionPayload = ({
  accessibleResolvedPageKey,
  effectiveAcknowledgeMs,
  resolvedHref,
  sourceId,
  transitionKind,
}: KangurRouteTransitionPayloadInput): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  const trimmedSourceId = sourceId?.trim() ?? '';

  if (resolvedHref) {
    payload.href = resolvedHref;
  }
  if (accessibleResolvedPageKey) {
    payload.pageKey = accessibleResolvedPageKey;
  }
  if (trimmedSourceId) {
    payload.sourceId = trimmedSourceId;
  }
  if (effectiveAcknowledgeMs > 0) {
    payload.acknowledgeMs = effectiveAcknowledgeMs;
  }
  if (transitionKind) {
    payload.transitionKind = transitionKind;
  }

  return payload;
};

const resolveManagedTransitionResult = (transitionResult: unknown): KangurManagedTransitionResult => {
  if (
    transitionResult &&
    typeof transitionResult === 'object' &&
    'started' in transitionResult &&
    'acknowledgeMs' in transitionResult
  ) {
    return transitionResult as KangurManagedTransitionResult;
  }
  return KANGUR_STARTED_TRANSITION_FALLBACK;
};

const resolveAccessibleManagedTransitionPageKey = ({
  basePath,
  currentAccessiblePageKey,
  pageKey,
  resolvedHref,
  resolveManagedTargetPageKey,
}: {
  basePath: string;
  currentAccessiblePageKey: string;
  pageKey?: string | null;
  resolvedHref: string | null;
  resolveManagedTargetPageKey: (input: {
    basePath: string;
    fallbackPageKey: string;
    href: string | null;
    pageKey?: string | null;
  }) => string | null;
}): string | null => {
  const targetBasePath = resolvedHref ? resolveManagedKangurBasePath(resolvedHref) : basePath;
  return resolveManagedTargetPageKey({
    basePath: targetBasePath,
    fallbackPageKey: currentAccessiblePageKey,
    href: resolvedHref,
    pageKey,
  });
};

const canUseKangurBrowserHistoryBack = (): boolean =>
  typeof window !== 'undefined' && window.history.length > 1;

const resolveTrimmedManagedFallbackHref = (fallbackHref?: string | null): string | null => {
  if (typeof fallbackHref !== 'string') {
    return null;
  }
  const trimmedFallbackHref = fallbackHref.trim();
  return trimmedFallbackHref.length > 0 ? trimmedFallbackHref : null;
};

const resolveManagedBackPageKey = (
  options: KangurBackNavigationOptions
): string | null => options.fallbackPageKey ?? options.pageKey ?? null;

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
  const { resolveManagedTargetPageKey } = useKangurRouteAccess();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const navigatorState = resolveKangurNavigatorState(routing);
  const publicOwner = resolveKangurFrontendPublicOwner(frontendPublicOwner);

  const resolveManagedHref = useCallback(
    (href: string, transitionKind?: KangurRouteTransitionKind | null): string =>
      resolveManagedNavigatorHref({
        frontendPublicOwner: publicOwner,
        href,
        locale,
        pathname,
        transitionKind,
      }),
    [locale, pathname, publicOwner]
  );

  const startManagedTransition = useCallback(
    (
      href: string | null,
      { acknowledgeMs, pageKey, sourceId, transitionKind }: KangurManagedTransitionOptions = {}
    ): KangurManagedTransitionResult => {
      const effectiveAcknowledgeMs = resolveEffectiveManagedAcknowledgeMs(acknowledgeMs);
      if (!canStartManagedRouteTransition(routeTransitionActions, href)) {
        return KANGUR_STARTED_TRANSITION_FALLBACK;
      }

      const pathSnapshot = resolveManagedTransitionPathSnapshot(
        href,
        pathname,
        navigatorState.requestedHref
      );
      if (
        shouldBypassPendingManagedTransition({
          href,
          routeTransitionState,
          snapshot: pathSnapshot,
        }) ||
        shouldBypassRequestedHrefManagedTransition({
          href,
          requestedHref: navigatorState.requestedHref,
          snapshot: pathSnapshot,
        })
      ) {
        return KANGUR_STARTED_TRANSITION_FALLBACK;
      }

      const resolvedHref = href ? resolveManagedHref(href, transitionKind) : null;
      const accessibleResolvedPageKey = resolveAccessibleManagedTransitionPageKey({
        basePath: navigatorState.basePath,
        currentAccessiblePageKey: navigatorState.currentAccessiblePageKey,
        pageKey,
        resolvedHref,
        resolveManagedTargetPageKey,
      });

      const transitionResult = routeTransitionActions.startRouteTransition(
        buildManagedRouteTransitionPayload({
          accessibleResolvedPageKey,
          effectiveAcknowledgeMs,
          resolvedHref,
          sourceId,
          transitionKind,
        })
      );
      return resolveManagedTransitionResult(transitionResult);
    },
    [
      navigatorState.basePath,
      navigatorState.currentAccessiblePageKey,
      navigatorState.requestedHref,
      pathname,
      resolveManagedHref,
      resolveManagedTargetPageKey,
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
      const fallbackHref = resolveTrimmedManagedFallbackHref(options.fallbackHref);
      if (!canUseKangurBrowserHistoryBack()) {
        if (!fallbackHref) {
          return;
        }
        push(fallbackHref, {
          acknowledgeMs: options.acknowledgeMs,
          pageKey: resolveManagedBackPageKey(options),
          scroll: options.scroll,
          sourceId: options.sourceId,
        });
        return;
      }

      const transitionResult = startManagedTransition(null, {
        ...options,
        pageKey: resolveManagedBackPageKey(options),
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
