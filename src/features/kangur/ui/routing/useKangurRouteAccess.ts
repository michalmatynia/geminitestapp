'use client';

import { useCallback } from 'react';

import { resolveAccessibleKangurRouteState } from '@/features/kangur/config/page-access';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import {
  resolveAccessibleKangurPendingRouteLoadingSnapshot,
  type KangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import {
  resolveAccessibleKangurRouteTransitionTarget,
  resolveKangurRouteTransitionSkeletonVariant,
  type KangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';
import {
  resolveAccessibleManagedKangurTargetPageKey,
  sanitizeAccessibleManagedKangurHref,
  getKangurSlugFromPathname,
} from '@/features/kangur/ui/routing/managed-paths';

// useKangurRouteAccess provides session-aware route resolution helpers used
// throughout the StudiQ shell. All helpers inject the current NextAuth session
// so access-controlled routes (e.g. admin-only pages) can be resolved
// correctly without each call site needing to read the session itself.
//
// Returned helpers:
//  resolveRouteState          – resolves the accessible page key + path for
//                               the current URL, applying access rules
//  sanitizeManagedHref        – strips managed embed prefixes and
//                               canonicalises public aliases in hrefs
//  resolveManagedTargetPageKey – resolves the page key for a target href,
//                               respecting access rules
//  resolveRoutePageKey        – resolves a page key from a raw pathname
//  resolvePendingSnapshot     – filters a pending route loading snapshot
//                               through access rules
//  resolveTransitionTarget    – resolves the page key + skeleton variant for
//                               a transition target href
//  resolveTransitionSkeletonVariant – resolves only the skeleton variant
export const useKangurRouteAccess = (): {
  resolveRouteState: <TPageKey extends string>(input: {
    normalizedBasePath: string;
    pageKey: TPageKey | null | undefined;
    requestedPath: string;
    fallbackPageKey?: TPageKey;
  }) => {
    pageKey: TPageKey;
    requestedPath: string;
  };
  sanitizeManagedHref: (input: {
    href: string | null | undefined;
    pathname: string | null;
    currentOrigin?: string | null;
    canonicalizePublicAlias?: boolean;
    basePath?: string | null;
    fallbackHref: string;
  }) => string | undefined;
  resolveManagedTargetPageKey: (input: {
    basePath: string;
    fallbackPageKey: string;
    href?: string | null;
    pageKey?: string | null;
  }) => string;
  resolveRoutePageKey: (
    pathname: string | null | undefined,
    basePath?: string | null,
    fallbackPageKey?: string | null
  ) => string;
  resolvePendingSnapshot: (input: {
    currentHref?: string | null;
    fallbackPageKey?: string | null;
    snapshot: KangurPendingRouteLoadingSnapshot | null;
  }) => KangurPendingRouteLoadingSnapshot | null;
  resolveTransitionTarget: (input: {
    basePath?: string | null;
    fallbackPageKey?: string | null;
    href?: string | null;
    pageKey?: string | null;
  }) => {
    pageKey: string;
    skeletonVariant: KangurRouteTransitionSkeletonVariant;
  };
  resolveTransitionSkeletonVariant: (input: {
    basePath?: string | null;
    fallbackPageKey?: string | null;
    href?: string | null;
    pageKey?: string | null;
  }) => KangurRouteTransitionSkeletonVariant;
} => {
  const { data: session } = useOptionalNextAuthSession();

  // resolveRouteState: resolves the accessible page key and normalised
  // requested path for the current URL. Applies session-based access rules
  // so restricted pages fall back to the fallbackPageKey.
  const resolveRouteState = useCallback(
    <TPageKey extends string>(input: {
      normalizedBasePath: string;
      pageKey: TPageKey | null | undefined;
      requestedPath: string;
      fallbackPageKey?: TPageKey;
    }): {
      pageKey: TPageKey;
      requestedPath: string;
    } =>
      resolveAccessibleKangurRouteState({
        ...input,
        session,
        slugSegments: getKangurSlugFromPathname(input.requestedPath, input.normalizedBasePath),
      }),
    [session]
  );

  // sanitizeManagedHref: strips managed embed path prefixes (e.g.
  // __kangur_embed__:) and canonicalises public-alias hrefs. Used when
  // building callback URLs for login redirects.
  const sanitizeManagedHref = useCallback(
    (input: {
      href: string | null | undefined;
      pathname: string | null;
      currentOrigin?: string | null;
      canonicalizePublicAlias?: boolean;
      basePath?: string | null;
      fallbackHref: string;
    }): string | undefined =>
      sanitizeAccessibleManagedKangurHref({
        ...input,
        session,
      }),
    [session]
  );

  // resolveManagedTargetPageKey: resolves the page key for a navigation
  // target href, applying session-based access rules. Used by the route
  // navigator to attach the correct pageKey to transition payloads.
  const resolveManagedTargetPageKey = useCallback(
    (input: {
      basePath: string;
      fallbackPageKey: string;
      href?: string | null;
      pageKey?: string | null;
    }): string =>
      resolveAccessibleManagedKangurTargetPageKey({
        ...input,
        session,
      }),
    [session]
  );

  // resolveRoutePageKey: convenience wrapper that resolves a page key from a
  // raw pathname string. Defaults to /kangur base path and 'Game' fallback.
  const resolveRoutePageKey = useCallback(
    (
      pathname: string | null | undefined,
      basePath?: string | null,
      fallbackPageKey?: string | null
    ): string =>
      resolveAccessibleManagedKangurTargetPageKey({
        basePath: basePath ?? '/kangur',
        fallbackPageKey: fallbackPageKey?.trim() || 'Game',
        href: pathname,
        pageKey: null,
        session,
      }),
    [session]
  );

  // resolvePendingSnapshot: filters a pending route loading snapshot through
  // access rules. Returns null when the snapshot's target is not accessible
  // to the current session, preventing the skeleton from showing a restricted
  // page key.
  const resolvePendingSnapshot = useCallback(
    (input: {
      currentHref?: string | null;
      fallbackPageKey?: string | null;
      snapshot: KangurPendingRouteLoadingSnapshot | null;
    }): KangurPendingRouteLoadingSnapshot | null =>
      resolveAccessibleKangurPendingRouteLoadingSnapshot({
        ...input,
        session,
      }),
    [session]
  );

  // resolveTransitionTarget: resolves both the accessible page key and the
  // correct skeleton variant for a navigation target. Used by the shell to
  // pick the right skeleton shape before the page has loaded.
  const resolveTransitionTarget = useCallback(
    (input: {
      basePath?: string | null;
      fallbackPageKey?: string | null;
      href?: string | null;
      pageKey?: string | null;
    }): {
      pageKey: string;
      skeletonVariant: KangurRouteTransitionSkeletonVariant;
    } =>
      resolveAccessibleKangurRouteTransitionTarget({
        ...input,
        session,
      }),
    [session]
  );

  const resolveTransitionSkeletonVariant = useCallback(
    (input: {
      basePath?: string | null;
      fallbackPageKey?: string | null;
      href?: string | null;
      pageKey?: string | null;
    }): KangurRouteTransitionSkeletonVariant =>
      resolveKangurRouteTransitionSkeletonVariant({
        ...input,
        session,
      }),
    [session]
  );

  return {
    resolveRouteState,
    sanitizeManagedHref,
    resolveManagedTargetPageKey,
    resolveRoutePageKey,
    resolvePendingSnapshot,
    resolveTransitionTarget,
    resolveTransitionSkeletonVariant,
  };
};
