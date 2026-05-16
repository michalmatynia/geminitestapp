'use client';

import { useEffect, useRef, useState } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';

type LatchedNavigationSkeletonState = {
  embedded: boolean;
  pageKey: string;
  variant: KangurRouteTransitionSkeletonVariant | null;
};

const NAVIGATION_SKELETON_DELAY_MS = 0;

type KangurNavigationSkeletonInput = {
  embedded: boolean;
  isBootLoading: boolean;
  isNavigationTransitionActive: boolean;
  isRouteAcknowledging: boolean;
  isRoutePending: boolean;
  isRouteWaitingForReady: boolean;
  isRouteRevealing: boolean;
  isRouteSkeletonVisible: boolean;
  shouldSkipNavigationSkeletonDelay: boolean;
  shouldShowAcknowledgingNavigationSkeleton: boolean;
  currentNavigationTopBarHeightCssValue: string | null;
  pendingPageKey: string | null;
  activeTransitionPageKey: string | null;
  activeTransitionSkeletonVariant: KangurRouteTransitionSkeletonVariant | null;
  transitionPageKey: string;
  transitionEmbedded: boolean;
};

export type KangurNavigationSkeletonOutput = {
  isNavigationSkeletonVisible: boolean;
  latchedNavigationTopBarHeightCssValue: string | null;
  latchedNavigationSkeletonRef: React.MutableRefObject<LatchedNavigationSkeletonState | null>;
};

export function useKangurNavigationSkeleton(
  input: KangurNavigationSkeletonInput
): KangurNavigationSkeletonOutput {
  const {
    embedded,
    isBootLoading,
    isNavigationTransitionActive,
    isRouteAcknowledging,
    isRoutePending,
    isRouteRevealing,
    isRouteSkeletonVisible,
    isRouteWaitingForReady,
    shouldSkipNavigationSkeletonDelay,
    shouldShowAcknowledgingNavigationSkeleton,
    currentNavigationTopBarHeightCssValue,
    pendingPageKey,
    activeTransitionPageKey,
    activeTransitionSkeletonVariant,
    transitionPageKey,
    transitionEmbedded,
  } = input;

  const [isNavigationSkeletonVisible, setIsNavigationSkeletonVisible] = useState(false);
  const [latchedNavigationTopBarHeightCssValue, setLatchedNavigationTopBarHeightCssValue] =
    useState<string | null>(null);
  const navigationSkeletonShownRef = useRef(false);
  const latchedNavigationSkeletonRef =
    useRef<LatchedNavigationSkeletonState | null>(null);

  useEffect(() => {
    if (isNavigationTransitionActive) {
      const nextTransitionPageKey = pendingPageKey ?? activeTransitionPageKey ?? null;
      const nextTransitionSkeletonVariant = activeTransitionSkeletonVariant ?? null;
      const nextTransitionEmbedded = embedded && transitionEmbedded;

      if (
        latchedNavigationSkeletonRef.current === null ||
        nextTransitionPageKey !== null ||
        nextTransitionSkeletonVariant !== null
      ) {
        latchedNavigationSkeletonRef.current = {
          embedded:
            latchedNavigationSkeletonRef.current?.embedded ?? nextTransitionEmbedded,
          pageKey:
            nextTransitionPageKey ??
            latchedNavigationSkeletonRef.current?.pageKey ??
            transitionPageKey,
          variant:
            nextTransitionSkeletonVariant ??
            latchedNavigationSkeletonRef.current?.variant ??
            null,
        };
      }
      return;
    }

    if (!isRouteSkeletonVisible) {
      latchedNavigationSkeletonRef.current = null;
    }
  }, [
    activeTransitionPageKey,
    activeTransitionSkeletonVariant,
    isNavigationTransitionActive,
    isRouteSkeletonVisible,
    pendingPageKey,
    transitionEmbedded,
    transitionPageKey,
    embedded,
  ]);

  useEffect(() => {
    if (!isNavigationTransitionActive) {
      setLatchedNavigationTopBarHeightCssValue(null);
      return;
    }

    const nextTopBarHeightCssValue =
      currentNavigationTopBarHeightCssValue ?? readKangurTopBarHeightCssValue();
    if (!nextTopBarHeightCssValue) return;

    setLatchedNavigationTopBarHeightCssValue(
      (current) => current ?? nextTopBarHeightCssValue
    );
  }, [currentNavigationTopBarHeightCssValue, isNavigationTransitionActive]);

  useEffect(() => {
    if (isBootLoading) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    if (shouldShowAcknowledgingNavigationSkeleton) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRouteAcknowledging) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    if (isRoutePending && shouldSkipNavigationSkeletonDelay) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRoutePending && navigationSkeletonShownRef.current) {
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRoutePending) {
      const timeoutId = safeSetTimeout(() => {
        navigationSkeletonShownRef.current = true;
        setIsNavigationSkeletonVisible(true);
      }, NAVIGATION_SKELETON_DELAY_MS);
      return () => { safeClearTimeout(timeoutId); };
    }

    if (isRouteWaitingForReady) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (isRouteRevealing) {
      navigationSkeletonShownRef.current = true;
      setIsNavigationSkeletonVisible(true);
      return;
    }

    if (!isNavigationTransitionActive) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    return undefined;
  }, [
    isBootLoading,
    isNavigationTransitionActive,
    isRouteAcknowledging,
    isRoutePending,
    isRouteWaitingForReady,
    isRouteRevealing,
    shouldSkipNavigationSkeletonDelay,
    shouldShowAcknowledgingNavigationSkeleton,
  ]);

  return {
    isNavigationSkeletonVisible,
    latchedNavigationTopBarHeightCssValue,
    latchedNavigationSkeletonRef,
  };
}
