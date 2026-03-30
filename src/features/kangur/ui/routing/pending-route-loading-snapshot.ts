import { useSyncExternalStore } from 'react';
import type { Session } from 'next-auth';

import {
  resolveManagedKangurBasePath,
} from '@/features/kangur/ui/routing/managed-paths';
import {
  resolveAccessibleKangurRouteTransitionTarget,
  type KangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';

export type KangurPendingRouteLoadingSnapshot = {
  fromHref: string | null;
  href: string | null;
  pageKey: string | null;
  skeletonVariant: KangurRouteTransitionSkeletonVariant;
  startedAt: number;
  topBarHeightCssValue: string | null;
};

const PENDING_ROUTE_LOADING_SNAPSHOT_MAX_AGE_MS = 10_000;

let pendingRouteLoadingSnapshot: KangurPendingRouteLoadingSnapshot | null = null;
const listeners = new Set<() => void>();

const emitPendingRouteLoadingSnapshot = (): void => {
  listeners.forEach((listener) => listener());
};

const normalizePendingRouteLoadingSnapshot = (
  snapshot: KangurPendingRouteLoadingSnapshot | null
): KangurPendingRouteLoadingSnapshot | null => {
  if (!snapshot) {
    return null;
  }

  if (Date.now() - snapshot.startedAt > PENDING_ROUTE_LOADING_SNAPSHOT_MAX_AGE_MS) {
    pendingRouteLoadingSnapshot = null;
    return null;
  }

  return snapshot;
};

const resolvePendingRouteLoadingFallbackPageKey = (
  fallbackPageKey: string | null | undefined
): string => fallbackPageKey?.trim() || 'Game';

const resolvePendingRouteLoadingTargetHref = ({
  currentHref,
  snapshot,
}: {
  currentHref: string | null;
  snapshot: KangurPendingRouteLoadingSnapshot;
}): string => snapshot.href?.trim() || currentHref?.trim() || '/';

const resolveAccessiblePendingRouteLoadingTarget = ({
  currentHref,
  fallbackPageKey,
  session,
  snapshot,
}: {
  currentHref: string | null;
  fallbackPageKey: string | null | undefined;
  session: Session | null;
  snapshot: KangurPendingRouteLoadingSnapshot;
}): {
  pageKey: string;
  skeletonVariant: KangurRouteTransitionSkeletonVariant;
} => {
  const targetHref = resolvePendingRouteLoadingTargetHref({ currentHref, snapshot });
  return resolveAccessibleKangurRouteTransitionTarget({
    basePath: resolveManagedKangurBasePath(targetHref),
    fallbackPageKey: resolvePendingRouteLoadingFallbackPageKey(fallbackPageKey),
    href: targetHref,
    pageKey: snapshot.pageKey?.trim() || null,
    session,
  });
};

const shouldUpdatePendingRouteLoadingSnapshot = ({
  resolvedPageKey,
  resolvedSkeletonVariant,
  snapshot,
}: {
  resolvedPageKey: string;
  resolvedSkeletonVariant: KangurRouteTransitionSkeletonVariant;
  snapshot: KangurPendingRouteLoadingSnapshot;
}): boolean =>
  resolvedPageKey !== snapshot.pageKey || resolvedSkeletonVariant !== snapshot.skeletonVariant;

export const resolveAccessibleKangurPendingRouteLoadingSnapshot = ({
  currentHref = null,
  fallbackPageKey = 'Game',
  session = null,
  snapshot,
}: {
  currentHref?: string | null;
  fallbackPageKey?: string | null;
  session?: Session | null;
  snapshot: KangurPendingRouteLoadingSnapshot | null;
}): KangurPendingRouteLoadingSnapshot | null => {
  const normalizedSnapshot = normalizePendingRouteLoadingSnapshot(snapshot);

  if (!normalizedSnapshot) {
    return null;
  }

  const resolvedTarget = resolveAccessiblePendingRouteLoadingTarget({
    currentHref,
    fallbackPageKey,
    session,
    snapshot: normalizedSnapshot,
  });

  return shouldUpdatePendingRouteLoadingSnapshot({
    resolvedPageKey: resolvedTarget.pageKey,
    resolvedSkeletonVariant: resolvedTarget.skeletonVariant,
    snapshot: normalizedSnapshot,
  })
    ? {
        ...normalizedSnapshot,
        pageKey: resolvedTarget.pageKey,
        skeletonVariant: resolvedTarget.skeletonVariant,
      }
    : normalizedSnapshot;
};

export const setKangurPendingRouteLoadingSnapshot = (
  snapshot: KangurPendingRouteLoadingSnapshot
): void => {
  pendingRouteLoadingSnapshot = snapshot;
  emitPendingRouteLoadingSnapshot();
};

export const clearKangurPendingRouteLoadingSnapshot = (): void => {
  if (!pendingRouteLoadingSnapshot) {
    return;
  }

  pendingRouteLoadingSnapshot = null;
  emitPendingRouteLoadingSnapshot();
};

export const getKangurPendingRouteLoadingSnapshot =
  (): KangurPendingRouteLoadingSnapshot | null =>
    normalizePendingRouteLoadingSnapshot(pendingRouteLoadingSnapshot);

const subscribeToKangurPendingRouteLoadingSnapshot = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useKangurPendingRouteLoadingSnapshot =
  (): KangurPendingRouteLoadingSnapshot | null =>
    useSyncExternalStore(
      subscribeToKangurPendingRouteLoadingSnapshot,
      getKangurPendingRouteLoadingSnapshot,
      () => null
    );
