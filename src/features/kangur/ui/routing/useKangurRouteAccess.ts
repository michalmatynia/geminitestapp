import { useCallback } from 'react';

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
} from '@/features/kangur/ui/routing/managed-paths';

export const useKangurRouteAccess = (): {
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
    sanitizeManagedHref,
    resolveManagedTargetPageKey,
    resolvePendingSnapshot,
    resolveTransitionTarget,
    resolveTransitionSkeletonVariant,
  };
};
