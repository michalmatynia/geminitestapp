'use client';

import { useMemo } from 'react';

import { resolveManagedKangurEmbeddedFromHref } from '@/features/kangur/ui/routing/managed-paths';

import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import type { KangurNavigationSkeletonOutput } from '@/features/kangur/ui/hooks/useKangurNavigationSkeleton';

type KangurSkeletonOverlayInput = {
  activeTransitionSkeletonVariant: KangurRouteTransitionSkeletonVariant | null;
  basePath: string;
  currentNavigationTopBarHeightCssValue: string | null;
  embedded: boolean;
  isLanguageSwitcherTransition: boolean;
  isPendingRouteSnapshotVisible: boolean;
  isRouteSkeletonVisible: boolean;
  navSkeleton: KangurNavigationSkeletonOutput;
  pendingRouteLoadingSnapshot: {
    href: string | null;
    pageKey: string | null;
    skeletonVariant?: KangurRouteTransitionSkeletonVariant | null;
    topBarHeightCssValue: string | null;
  } | null;
  prefersReducedMotion: boolean;
  resolvedPageKey: string | null;
  transitionEmbedded: boolean;
  transitionPageKey: string;
};

type KangurSkeletonOverlayOutput = {
  routeSkeletonMotionProps: {
    animate: Record<string, unknown>;
    exit: Record<string, unknown>;
    initial: Record<string, unknown>;
    transition: Record<string, unknown>;
  };
  visibleTransitionSkeletonEmbedded: boolean;
  visibleTransitionSkeletonPageKey: string;
  visibleTransitionSkeletonTopBarHeightCssValue: string | null;
  visibleTransitionSkeletonVariant: KangurRouteTransitionSkeletonVariant | null;
};

const KANGUR_MAIN_PAGE = 'Home';

export function useKangurSkeletonOverlayState(
  input: KangurSkeletonOverlayInput
): KangurSkeletonOverlayOutput {
  const {
    activeTransitionSkeletonVariant,
    basePath,
    currentNavigationTopBarHeightCssValue,
    embedded,
    isLanguageSwitcherTransition,
    isPendingRouteSnapshotVisible,
    isRouteSkeletonVisible,
    navSkeleton,
    pendingRouteLoadingSnapshot,
    prefersReducedMotion,
    resolvedPageKey,
    transitionEmbedded,
    transitionPageKey,
  } = input;

  const { latchedNavigationSkeletonRef, latchedNavigationTopBarHeightCssValue } = navSkeleton;

  const snapshotTransitionPageKey =
    pendingRouteLoadingSnapshot?.pageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const snapshotTransitionEmbedded =
    resolveManagedKangurEmbeddedFromHref({
      href: pendingRouteLoadingSnapshot?.href ?? null,
      basePath,
    }) ?? embedded;
  const snapshotTransitionTopBarHeightCssValue =
    pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? null;

  const visibleTransitionSkeletonPageKey = isPendingRouteSnapshotVisible
    ? snapshotTransitionPageKey
    : isRouteSkeletonVisible
    ? latchedNavigationSkeletonRef.current?.pageKey ?? transitionPageKey
    : transitionPageKey;

  const visibleTransitionSkeletonVariant = isPendingRouteSnapshotVisible
    ? pendingRouteLoadingSnapshot?.skeletonVariant ?? activeTransitionSkeletonVariant
    : isRouteSkeletonVisible
    ? latchedNavigationSkeletonRef.current?.variant ?? activeTransitionSkeletonVariant
    : activeTransitionSkeletonVariant;

  const visibleTransitionSkeletonEmbedded = isPendingRouteSnapshotVisible
    ? snapshotTransitionEmbedded
    : isRouteSkeletonVisible
    ? latchedNavigationSkeletonRef.current?.embedded ?? (embedded && transitionEmbedded)
    : embedded;

  const visibleTransitionSkeletonTopBarHeightCssValue = isPendingRouteSnapshotVisible
    ? snapshotTransitionTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : isRouteSkeletonVisible
    ? latchedNavigationTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : null;

  const routeSkeletonMotionProps = useMemo(
    () =>
      prefersReducedMotion
        ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
        : isLanguageSwitcherTransition
          ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const } }
          : { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
    [isLanguageSwitcherTransition, prefersReducedMotion]
  );

  return {
    routeSkeletonMotionProps,
    visibleTransitionSkeletonEmbedded,
    visibleTransitionSkeletonPageKey,
    visibleTransitionSkeletonTopBarHeightCssValue,
    visibleTransitionSkeletonVariant: visibleTransitionSkeletonVariant ?? null,
  };
}
