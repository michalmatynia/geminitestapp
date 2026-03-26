'use client';

import { useSyncExternalStore } from 'react';
import type { Session } from 'next-auth';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import {
  normalizeManagedKangurPathname,
  resolveAccessibleManagedKangurPageKeyFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import {
  resolveKangurRouteTransitionSkeletonVariant,
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

const resolveKangurBasePathForPendingSnapshot = (href: string | null): string => {
  const normalizedPathname = normalizeManagedKangurPathname(href);

  if (!normalizedPathname) {
    return '/';
  }

  return normalizedPathname === KANGUR_BASE_PATH ||
    normalizedPathname.startsWith(`${KANGUR_BASE_PATH}/`)
    ? KANGUR_BASE_PATH
    : '/';
};

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

  const normalizedFallbackPageKey = fallbackPageKey?.trim() || 'Game';
  const targetHref = normalizedSnapshot.href?.trim() || currentHref?.trim() || '/';
  const basePath = resolveKangurBasePathForPendingSnapshot(targetHref);
  const resolvedPageKey =
    resolveAccessibleKangurPageKey(
      normalizedSnapshot.pageKey?.trim() || null,
      session,
      resolveAccessibleManagedKangurPageKeyFromHref({
        href: targetHref,
        basePath,
        session,
        fallbackPageKey: normalizedFallbackPageKey,
      })
    ) ?? normalizedFallbackPageKey;
  const resolvedSkeletonVariant = resolveKangurRouteTransitionSkeletonVariant({
    basePath,
    fallbackPageKey: normalizedFallbackPageKey,
    href: targetHref,
    pageKey: resolvedPageKey,
    session,
  });

  return resolvedPageKey === normalizedSnapshot.pageKey &&
    resolvedSkeletonVariant === normalizedSnapshot.skeletonVariant
    ? normalizedSnapshot
    : {
        ...normalizedSnapshot,
        pageKey: resolvedPageKey,
        skeletonVariant: resolvedSkeletonVariant,
      };
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
