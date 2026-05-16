'use client';

import { useEffect, useRef, useState } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';

import type { JSX } from 'react';

export type KangurInitialHomeBootPhase = 'loader' | 'page-skeleton' | 'interactive';

type KangurInitialHomeBootWindow = Window & {
  __kangurInitialHomeBootComplete?: boolean;
};

const BOOT_SKELETON_MIN_VISIBLE_MS = 50;
const INITIAL_HOME_SKELETON_MIN_VISIBLE_MS = 0;

const hasCompletedKangurInitialHomeBoot = (): boolean =>
  typeof window !== 'undefined' &&
  (window as KangurInitialHomeBootWindow).__kangurInitialHomeBootComplete === true;

export const markKangurInitialHomeBootComplete = (): void => {
  if (typeof window === 'undefined') return;
  (window as KangurInitialHomeBootWindow).__kangurInitialHomeBootComplete = true;
};

type KangurBootOrchestratorInput = {
  embedded: boolean;
  isBootLoading: boolean;
  isThemeBootLoading: boolean;
  isSettingsRefresh: boolean;
  isStandaloneHomeRoute: boolean;
  basePath: string;
  hasStandaloneHomeTopNavigationRegistration: boolean;
  routeContent: JSX.Element | null;
  isNavigationTransitionActive: boolean;
  isPendingRouteSnapshotVisible: boolean;
  isNavigationSkeletonVisible: boolean;
  shouldShowAcknowledgingNavigationSkeleton: boolean;
  transitionPhase: string;
  isLanguageSwitcherTransition: boolean;
};

export type KangurBootOrchestratorOutput = {
  hasPresentedInteractiveShell: boolean;
  hasInitialContentSettled: boolean;
  initialHomeBootPhase: KangurInitialHomeBootPhase;
  isBootSkeletonVisible: boolean;
  isInitialHomeLoaderPhase: boolean;
  isInitialHomeSkeletonPhase: boolean;
  isInitialMountSkeletonVisible: boolean;
  isRouteInteractionReady: boolean;
  isRouteContentVisuallyHidden: boolean;
  isRouteSkeletonVisible: boolean;
  shouldKeepRouteContentVisibleDuringTransition: boolean;
  shouldShowFallbackBootLoader: boolean;
  shouldRunInitialHomeBoot: boolean;
  shouldSkipClientBootLoader: boolean;
};

export function useKangurBootOrchestrator(
  input: KangurBootOrchestratorInput
): KangurBootOrchestratorOutput {
  const {
    embedded,
    isBootLoading,
    isThemeBootLoading,
    isSettingsRefresh,
    isStandaloneHomeRoute,
    hasStandaloneHomeTopNavigationRegistration,
    routeContent,
    isNavigationTransitionActive,
    isPendingRouteSnapshotVisible,
    isNavigationSkeletonVisible,
    shouldShowAcknowledgingNavigationSkeleton,
    transitionPhase,
    isLanguageSwitcherTransition,
  } = input;

  const shouldRunInitialHomeBootRef = useRef<boolean | null>(null);
  shouldRunInitialHomeBootRef.current ??=
    isStandaloneHomeRoute && !isSettingsRefresh && !hasCompletedKangurInitialHomeBoot();
  const shouldRunInitialHomeBoot = shouldRunInitialHomeBootRef.current;
  const shouldSkipClientBootLoader = isStandaloneHomeRoute;
  const shouldBlockForThemeBoot = isThemeBootLoading && routeContent === null;

  const [hasPresentedInteractiveShell, setHasPresentedInteractiveShell] = useState(false);
  const [isRouteInteractionReady, setIsRouteInteractionReady] = useState(false);
  const [hasInitialContentSettled, setHasInitialContentSettled] = useState(false);
  const [initialHomeBootPhase, setInitialHomeBootPhase] =
    useState<KangurInitialHomeBootPhase>(() =>
      shouldRunInitialHomeBoot
        ? shouldSkipClientBootLoader ? 'page-skeleton' : 'loader'
        : 'interactive'
    );

  const isInitialHomeLoaderPhase = initialHomeBootPhase === 'loader';
  const isInitialHomeSkeletonPhase = initialHomeBootPhase === 'page-skeleton';
  const shouldShowFallbackBootLoader =
    shouldBlockForThemeBoot && !hasPresentedInteractiveShell && !isInitialHomeSkeletonPhase;

  const [isBootSkeletonVisible, setIsBootSkeletonVisible] = useState<boolean>(
    isInitialHomeLoaderPhase || shouldShowFallbackBootLoader
  );

  const bootSkeletonShownAtRef = useRef<number | null>(
    isInitialHomeLoaderPhase || shouldShowFallbackBootLoader ? Date.now() : null
  );
  const initialHomeSkeletonShownAtRef = useRef<number | null>(
    isInitialHomeSkeletonPhase ? Date.now() : null
  );

  const isInitialMountSkeletonVisible =
    routeContent === null && !hasInitialContentSettled && !hasPresentedInteractiveShell;
  const isInitialHomePageSkeletonVisible =
    isInitialHomeSkeletonPhase &&
    !isBootSkeletonVisible &&
    !isNavigationTransitionActive &&
    !isPendingRouteSnapshotVisible;

  const isRouteSkeletonVisible =
    shouldShowAcknowledgingNavigationSkeleton ||
    isNavigationSkeletonVisible ||
    isPendingRouteSnapshotVisible ||
    isInitialMountSkeletonVisible ||
    isInitialHomePageSkeletonVisible;

  const shouldPreserveOutgoingRouteContent =
    isPendingRouteSnapshotVisible ||
    (isRouteSkeletonVisible &&
      (transitionPhase === 'acknowledging' || transitionPhase === 'pending'));
  const shouldKeepRouteContentVisibleDuringTransition =
    shouldPreserveOutgoingRouteContent || isLanguageSwitcherTransition;
  const isRouteContentVisuallyHidden =
    (isInitialHomeLoaderPhase && !isRouteSkeletonVisible) ||
    isInitialMountSkeletonVisible ||
    isInitialHomePageSkeletonVisible ||
    (!shouldKeepRouteContentVisibleDuringTransition &&
      (transitionPhase === 'waiting_for_ready' ||
        ((transitionPhase === 'pending' ||
          (transitionPhase === 'acknowledging' && shouldShowAcknowledgingNavigationSkeleton)) &&
          isRouteSkeletonVisible) ||
        isPendingRouteSnapshotVisible));

  useEffect(() => {
    setIsRouteInteractionReady(true);
  }, []);

  useEffect(() => {
    if (hasInitialContentSettled) return;
    const frameId = requestAnimationFrame(() => { setHasInitialContentSettled(true); });
    return () => { cancelAnimationFrame(frameId); };
  }, [hasInitialContentSettled]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const id = safeSetTimeout(() => {
      if (isBootSkeletonVisible) {
        console.warn('[StudiQ boot debug] loader still visible at 3 s', {
          isBootLoading, isThemeBootLoading, isBootSkeletonVisible,
          hasPresentedInteractiveShell, routeContentIsNull: routeContent === null,
          shouldShowFallbackBootLoader, initialHomeBootPhase, embedded,
        });
      }
    }, 3_000);
    return () => { safeClearTimeout(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!embedded || !isBootSkeletonVisible) return;
    const id = safeSetTimeout(() => {
      bootSkeletonShownAtRef.current = null;
      setIsBootSkeletonVisible(false);
      setHasPresentedInteractiveShell(true);
    }, 8_000);
    return () => { safeClearTimeout(id); };
  }, [embedded, isBootSkeletonVisible]);

  useEffect(() => {
    if (shouldRunInitialHomeBoot && initialHomeBootPhase === 'interactive') {
      markKangurInitialHomeBootComplete();
    }
  }, [initialHomeBootPhase, shouldRunInitialHomeBoot]);

  useEffect(() => {
    if (initialHomeBootPhase === 'interactive' || isStandaloneHomeRoute) return;
    initialHomeSkeletonShownAtRef.current = null;
    bootSkeletonShownAtRef.current = null;
    setIsBootSkeletonVisible(false);
    setInitialHomeBootPhase('interactive');
  }, [initialHomeBootPhase, isStandaloneHomeRoute]);

  useEffect(() => {
    if (hasPresentedInteractiveShell) return;
    if (shouldRunInitialHomeBoot && initialHomeBootPhase !== 'interactive') return;
    if (!isThemeBootLoading) { setHasPresentedInteractiveShell(true); return; }
    if (
      isBootLoading ||
      isRouteSkeletonVisible ||
      isRouteContentVisuallyHidden ||
      routeContent === null
    ) return;
    setHasPresentedInteractiveShell(true);
  }, [
    hasPresentedInteractiveShell,
    initialHomeBootPhase,
    isBootLoading,
    isRouteContentVisuallyHidden,
    isRouteSkeletonVisible,
    isThemeBootLoading,
    routeContent,
    shouldRunInitialHomeBoot,
  ]);

  useEffect(() => {
    if (isInitialHomeLoaderPhase) {
      if (bootSkeletonShownAtRef.current === null) bootSkeletonShownAtRef.current = Date.now();
      setIsBootSkeletonVisible(true);
      if (isBootLoading || shouldBlockForThemeBoot) return;

      const shownAt = bootSkeletonShownAtRef.current;
      const remainingMs = Math.max(0, BOOT_SKELETON_MIN_VISIBLE_MS - (Date.now() - shownAt));
      const timeoutId = safeSetTimeout(() => {
        bootSkeletonShownAtRef.current = null;
        initialHomeSkeletonShownAtRef.current = Date.now();
        setIsBootSkeletonVisible(false);
        setInitialHomeBootPhase('page-skeleton');
      }, remainingMs);
      return () => { safeClearTimeout(timeoutId); };
    }

    if (shouldShowFallbackBootLoader) {
      if (bootSkeletonShownAtRef.current === null) bootSkeletonShownAtRef.current = Date.now();
      setIsBootSkeletonVisible(true);
      return;
    }

    const shownAt = bootSkeletonShownAtRef.current;
    if (shownAt === null) { setIsBootSkeletonVisible(false); return; }

    const remainingMs = Math.max(0, BOOT_SKELETON_MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timeoutId = safeSetTimeout(() => {
      bootSkeletonShownAtRef.current = null;
      setIsBootSkeletonVisible(false);
    }, remainingMs);
    return () => { safeClearTimeout(timeoutId); };
  }, [isBootLoading, isInitialHomeLoaderPhase, shouldBlockForThemeBoot, shouldShowFallbackBootLoader]);

  useEffect(() => {
    if (!isInitialHomeSkeletonPhase) return;
    if (
      isBootLoading || shouldBlockForThemeBoot ||
      !hasStandaloneHomeTopNavigationRegistration ||
      !hasInitialContentSettled || routeContent === null
    ) return;

    const shownAt = initialHomeSkeletonShownAtRef.current ?? Date.now();
    initialHomeSkeletonShownAtRef.current = shownAt;
    const remainingMs = Math.max(
      0, INITIAL_HOME_SKELETON_MIN_VISIBLE_MS - (Date.now() - shownAt)
    );
    const timeoutId = safeSetTimeout(() => {
      initialHomeSkeletonShownAtRef.current = null;
      setInitialHomeBootPhase('interactive');
    }, remainingMs);
    return () => { safeClearTimeout(timeoutId); };
  }, [
    hasInitialContentSettled,
    hasStandaloneHomeTopNavigationRegistration,
    isBootLoading,
    isInitialHomeSkeletonPhase,
    shouldBlockForThemeBoot,
    routeContent,
  ]);

  return {
    hasPresentedInteractiveShell,
    hasInitialContentSettled,
    initialHomeBootPhase,
    isBootSkeletonVisible,
    isInitialHomeLoaderPhase,
    isInitialHomeSkeletonPhase,
    isInitialMountSkeletonVisible,
    isRouteInteractionReady,
    isRouteContentVisuallyHidden,
    isRouteSkeletonVisible,
    shouldKeepRouteContentVisibleDuringTransition,
    shouldShowFallbackBootLoader,
    shouldRunInitialHomeBoot,
    shouldSkipClientBootLoader,
  };
}
