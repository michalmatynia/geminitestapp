'use client';

import { useSyncExternalStore } from 'react';

import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

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
