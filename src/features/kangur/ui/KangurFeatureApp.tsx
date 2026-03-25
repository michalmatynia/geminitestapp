'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { KangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/KangurCmsRuntimeScreen';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { getKangurHomeHref, resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';

const KangurAiTutorWidget = dynamic(() => import('@/features/kangur/ui/components/KangurAiTutorWidget').then(m => ({ default: m.KangurAiTutorWidget })), { ssr: false });
const KangurLoginModal = dynamic(() => import('@/features/kangur/ui/components/KangurLoginModal').then(m => ({ default: m.KangurLoginModal })), { ssr: false });
import { KangurRouteAccessibilityAnnouncer } from '@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer';
const PageNotFound = dynamic(() => import('@/features/kangur/ui/components/PageNotFound').then(m => ({ default: m.PageNotFound })), { ssr: false });
const UserNotRegisteredError = dynamic(() => import('@/features/kangur/ui/components/UserNotRegisteredError'), { ssr: false });
import { KangurAiTutorContentProvider } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurAiTutorDeferredProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurContextRegistryPageBoundary } from '@/features/kangur/ui/context/KangurContextRegistryPageBoundary';
import { KangurAgeGroupFocusProvider } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLoginModalProvider } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurScoreSyncProvider } from '@/features/kangur/ui/context/KangurScoreSyncProvider';
import { KangurSubjectFocusProvider } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { KangurSubjectAgeGroupSync } from '@/features/kangur/ui/context/KangurSubjectAgeGroupSync';
import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import { useKangurPendingRouteLoadingSnapshot } from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { resolveManagedKangurEmbeddedFromHref } from '@/features/kangur/ui/routing/managed-paths';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import { cn } from '@/features/kangur/shared/utils';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import type { JSX } from 'react';

const BOOT_SKELETON_MIN_VISIBLE_MS = 120;
const NAVIGATION_SKELETON_DELAY_MS = 60;
const LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID = 'kangur-language-switcher';

type LatchedNavigationSkeletonState = {
  embedded: boolean;
  pageKey: string;
  variant: KangurRouteTransitionSkeletonVariant | null;
};

const AuthenticatedApp = (): JSX.Element | null => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    isAuthenticated,
    hasResolvedAuth = true,
  } =
    useKangurAuth();
  const { isLoading: isLoadingSettings } = useSettingsStore();
  const {
    isRouteAcknowledging,
    isRoutePending,
    isRouteWaitingForReady,
    isRouteRevealing,
    transitionPhase,
    activeTransitionSourceId,
    activeTransitionKind,
    pendingPageKey,
    activeTransitionPageKey,
    activeTransitionRequestedHref,
    activeTransitionSkeletonVariant,
  } = useKangurRouteTransitionState();
  const routeNavigator = useKangurRouteNavigator();
  const pendingRouteLoadingSnapshot = useKangurPendingRouteLoadingSnapshot();
  const { pageKey, embedded, requestedPath, requestedHref, basePath } = useKangurRouting();
  const authErrorType = authError?.type;
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const homeHref = getKangurHomeHref(basePath);
  const shouldRedirectToHome =
    !embedded &&
    hasResolvedAuth &&
    !isLoadingAuth &&
    !isAuthenticated &&
    !authErrorType &&
    resolvedPageKey === 'ParentDashboard';
  const prefersReducedMotion = useReducedMotion();
  const routeContentMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');
  const currentRequestedHref = requestedHref ?? requestedPath ?? null;
  const isBootLoading = isLoadingPublicSettings || isLoadingAuth;
  const isThemeBootLoading = isLoadingSettings;
  const isNavigationTransitionActive =
    isRouteAcknowledging || isRoutePending || isRouteWaitingForReady || isRouteRevealing;
  const isLanguageSwitcherTransition =
    activeTransitionKind === 'locale-switch' ||
    activeTransitionSourceId === LANGUAGE_SWITCHER_TRANSITION_SOURCE_ID;
  const shouldSkipNavigationSkeletonDelay = activeTransitionSourceId !== null;
  const shouldBlockRouteContent = shouldRedirectToHome;
  let routeContent: JSX.Element | null = null;
  if (authErrorType !== 'auth_required') {
    if (shouldBlockRouteContent) {
      routeContent = null;
    } else if (!resolvedPageKey) {
      routeContent = <PageNotFound />;
    } else {
      const ResolvedPage = kangurPages[resolvedPageKey];
      routeContent = ResolvedPage ? (
        <KangurCmsRuntimeScreen pageKey={resolvedPageKey} fallback={<ResolvedPage />} />
      ) : (
        <PageNotFound />
      );
    }
  }
  const [hasPresentedInteractiveShell, setHasPresentedInteractiveShell] = useState(false);
  const shouldShowBootLoader = isThemeBootLoading && !hasPresentedInteractiveShell;
  const [isBootSkeletonVisible, setIsBootSkeletonVisible] = useState<boolean>(shouldShowBootLoader);
  const [isNavigationSkeletonVisible, setIsNavigationSkeletonVisible] = useState<boolean>(false);
  const [latchedNavigationTopBarHeightCssValue, setLatchedNavigationTopBarHeightCssValue] =
    useState<string | null>(null);
  const bootSkeletonShownAtRef = useRef<number | null>(
    shouldShowBootLoader ? Date.now() : null
  );
  const navigationSkeletonShownRef = useRef(false);
  const latchedNavigationSkeletonRef = useRef<LatchedNavigationSkeletonState | null>(null);
  const transitionPageKey =
    pendingPageKey ?? activeTransitionPageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const transitionEmbedded =
    resolveManagedKangurEmbeddedFromHref({
      href: activeTransitionRequestedHref,
      basePath,
    }) ?? embedded;
  const isPendingRouteSnapshotVisible =
    !isNavigationTransitionActive &&
    pendingRouteLoadingSnapshot !== null &&
    pendingRouteLoadingSnapshot.href !== null &&
    pendingRouteLoadingSnapshot.href !== currentRequestedHref;
  const hasCommittedTargetRoute =
    (activeTransitionRequestedHref !== null &&
      activeTransitionRequestedHref !== currentRequestedHref) ||
    (activeTransitionPageKey !== null && activeTransitionPageKey !== resolvedPageKey) ||
    (pendingPageKey !== null && pendingPageKey !== resolvedPageKey);
  const shouldShowAcknowledgingNavigationSkeleton =
    isRouteAcknowledging && (isLanguageSwitcherTransition || hasCommittedTargetRoute);
  const snapshotTransitionPageKey =
    pendingRouteLoadingSnapshot?.pageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const snapshotTransitionEmbedded =
    resolveManagedKangurEmbeddedFromHref({
      href: pendingRouteLoadingSnapshot?.href ?? null,
      basePath,
    }) ?? embedded;
  const snapshotTransitionTopBarHeightCssValue =
    pendingRouteLoadingSnapshot?.topBarHeightCssValue ?? null;
  const isRouteSkeletonVisible =
    shouldShowAcknowledgingNavigationSkeleton ||
    isNavigationSkeletonVisible ||
    isPendingRouteSnapshotVisible;
  const visibleTransitionSkeletonPageKey =
    isPendingRouteSnapshotVisible
      ? snapshotTransitionPageKey
      : isRouteSkeletonVisible
      ? latchedNavigationSkeletonRef.current?.pageKey ?? transitionPageKey
      : transitionPageKey;
  const visibleTransitionSkeletonVariant =
    isPendingRouteSnapshotVisible
      ? pendingRouteLoadingSnapshot?.skeletonVariant ?? activeTransitionSkeletonVariant
      : isRouteSkeletonVisible
      ? latchedNavigationSkeletonRef.current?.variant ?? activeTransitionSkeletonVariant
      : activeTransitionSkeletonVariant;
  const visibleTransitionSkeletonEmbedded = isPendingRouteSnapshotVisible
    ? snapshotTransitionEmbedded
    : isRouteSkeletonVisible
    ? latchedNavigationSkeletonRef.current?.embedded ?? (embedded && transitionEmbedded)
    : embedded;
  const currentNavigationTopBarHeightCssValue =
    isNavigationTransitionActive || isRouteSkeletonVisible
      ? readKangurTopBarHeightCssValue()
      : null;
  const visibleTransitionSkeletonTopBarHeightCssValue = isPendingRouteSnapshotVisible
    ? snapshotTransitionTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : isRouteSkeletonVisible
    ? latchedNavigationTopBarHeightCssValue ?? currentNavigationTopBarHeightCssValue
    : null;
  const shouldKeepRouteContentVisibleDuringTransition =
    isLanguageSwitcherTransition && isRouteSkeletonVisible;
  const isRouteContentVisuallyHidden =
    isPendingRouteSnapshotVisible ||
    (!shouldKeepRouteContentVisibleDuringTransition &&
    (transitionPhase === 'waiting_for_ready' ||
      ((transitionPhase === 'pending' ||
        (transitionPhase === 'acknowledging' &&
          shouldShowAcknowledgingNavigationSkeleton)) &&
        isRouteSkeletonVisible)));
  const isRouteContentInteractionBlocked =
    isPendingRouteSnapshotVisible ||
    (isRouteSkeletonVisible && transitionPhase !== 'revealing');
  const hasVisibleRouteContent = routeContent !== null && !isRouteContentVisuallyHidden;
  const isBootLoaderBlockingNavigation =
    isBootSkeletonVisible && !isRouteSkeletonVisible && !hasVisibleRouteContent;
  const shouldHideTopNavigationDuringBoot = isBootLoaderBlockingNavigation;
  const shouldRenderInlineRouteSkeletonTopNavigation =
    !visibleTransitionSkeletonEmbedded &&
    !shouldHideTopNavigationDuringBoot &&
    isRouteSkeletonVisible;
  const shouldHideTopNavigationHost =
    !shouldHideTopNavigationDuringBoot && isRouteSkeletonVisible;
  const shouldSkipRouteContentPresence =
    isNavigationTransitionActive || isPendingRouteSnapshotVisible;

  useEffect(() => {
    if (hasPresentedInteractiveShell) {
      return;
    }

    if (!isThemeBootLoading) {
      setHasPresentedInteractiveShell(true);
      return;
    }

    if (
      isBootLoading ||
      isRouteSkeletonVisible ||
      isRouteContentVisuallyHidden ||
      routeContent === null
    ) {
      return;
    }

    setHasPresentedInteractiveShell(true);
  }, [
    hasPresentedInteractiveShell,
    isBootLoading,
    isRouteContentVisuallyHidden,
    isRouteSkeletonVisible,
    isThemeBootLoading,
    routeContent,
  ]);

  useEffect(() => {
    if (authErrorType === 'auth_required') {
      navigateToLogin();
    }
  }, [authErrorType, navigateToLogin]);

  useEffect(() => {
    if (!shouldRedirectToHome) {
      return;
    }

    routeNavigator.replace(homeHref, {
      pageKey: KANGUR_MAIN_PAGE,
      sourceId: 'kangur-auth:redirect-parent-dashboard',
    });
  }, [homeHref, routeNavigator, shouldRedirectToHome]);

  useEffect(() => {
    if (shouldShowBootLoader) {
      if (bootSkeletonShownAtRef.current === null) {
        bootSkeletonShownAtRef.current = Date.now();
      }
      setIsBootSkeletonVisible(true);
      return;
    }

    const shownAt = bootSkeletonShownAtRef.current;
    if (shownAt === null) {
      setIsBootSkeletonVisible(false);
      return;
    }

    const remainingMs = Math.max(0, BOOT_SKELETON_MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timeoutId = window.setTimeout(() => {
      bootSkeletonShownAtRef.current = null;
      setIsBootSkeletonVisible(false);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldShowBootLoader]);

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
            nextTransitionSkeletonVariant ?? latchedNavigationSkeletonRef.current?.variant ?? null,
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
    if (!nextTopBarHeightCssValue) {
      return;
    }

    setLatchedNavigationTopBarHeightCssValue(
      current => current ?? nextTopBarHeightCssValue
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
      const timeoutId = window.setTimeout(() => {
        navigationSkeletonShownRef.current = true;
        setIsNavigationSkeletonVisible(true);
      }, NAVIGATION_SKELETON_DELAY_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
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

  if (authErrorType === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  const topNavigationFallback = !embedded ? <KangurTopNavigationSkeleton /> : null;
  const shouldReserveTopBarOffset = !embedded && !shouldHideTopNavigationDuringBoot;

  return (
    <>
      <KangurRouteAccessibilityAnnouncer />
      {shouldHideTopNavigationDuringBoot ? null : shouldHideTopNavigationHost ? (
        null
      ) : (
        <KangurTopNavigationHost fallback={topNavigationFallback} />
      )}
      <KangurAppLoader
        offsetTopBar={shouldReserveTopBarOffset}
        visible={isBootLoaderBlockingNavigation}
      />
      {shouldSkipRouteContentPresence ? (
        routeContent ? (
          <motion.div
            key={routeTransitionKey}
            {...routeContentMotionProps}
            aria-busy={isNavigationTransitionActive || isPendingRouteSnapshotVisible}
            aria-hidden={isRouteContentVisuallyHidden ? 'true' : undefined}
            className={cn(
              'w-full min-w-0 kangur-shell-viewport-height',
              embedded ? 'min-h-full' : null,
              isRouteContentInteractionBlocked ? 'pointer-events-none' : null,
              isRouteContentVisuallyHidden ? 'pointer-events-none opacity-0' : null
            )}
            data-route-transition-phase={transitionPhase}
            data-route-transition-key={routeTransitionKey}
            data-route-transition-source-id={activeTransitionSourceId ?? undefined}
            data-testid='kangur-route-content'
          >
            {routeContent}
          </motion.div>
        ) : null
      ) : (
        <AnimatePresence mode='wait'>
          {routeContent ? (
            <motion.div
              key={routeTransitionKey}
              {...routeContentMotionProps}
              aria-busy={isNavigationTransitionActive || isPendingRouteSnapshotVisible}
              aria-hidden={isRouteContentVisuallyHidden ? 'true' : undefined}
              className={cn(
                'w-full min-w-0 kangur-shell-viewport-height',
                embedded ? 'min-h-full' : null,
                isRouteContentInteractionBlocked ? 'pointer-events-none' : null,
                isRouteContentVisuallyHidden ? 'pointer-events-none opacity-0' : null
              )}
              data-route-transition-phase={transitionPhase}
              data-route-transition-key={routeTransitionKey}
              data-route-transition-source-id={activeTransitionSourceId ?? undefined}
              data-testid='kangur-route-content'
            >
              {routeContent}
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
      <AnimatePresence>
        {isRouteSkeletonVisible ? (
          <motion.div
            key='kangur-page-transition-skeleton:navigation'
            animate={{ opacity: 1 }}
            className={transitionPhase === 'revealing' ? 'pointer-events-none' : undefined}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          >
            <KangurPageTransitionSkeleton
              embeddedOverride={visibleTransitionSkeletonEmbedded}
              pageKey={visibleTransitionSkeletonPageKey}
              reason={isLanguageSwitcherTransition ? 'locale-switch' : 'navigation'}
              renderInlineTopNavigationSkeleton={shouldRenderInlineRouteSkeletonTopNavigation}
              topBarHeightCssValue={visibleTransitionSkeletonTopBarHeightCssValue}
              variant={visibleTransitionSkeletonVariant}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export function KangurFeatureApp(): JSX.Element {
  return (
    <KangurRouteTransitionProvider>
      <KangurTopNavigationProvider>
        <KangurGuestPlayerProvider>
          <KangurLoginModalProvider>
            <KangurAuthProvider>
              <KangurSubjectFocusProvider>
                <KangurAgeGroupFocusProvider>
                  <KangurSubjectAgeGroupSync />
                  <KangurProgressSyncProvider>
                    <KangurScoreSyncProvider>
                      <KangurContextRegistryPageBoundary>
                        <KangurAiTutorContentProvider>
                          <KangurAiTutorDeferredProvider>
                            <KangurTutorAnchorProvider>
                              <AuthenticatedApp />
                              <KangurAiTutorWidget />
                              <KangurLoginModal />
                            </KangurTutorAnchorProvider>
                          </KangurAiTutorDeferredProvider>
                        </KangurAiTutorContentProvider>
                      </KangurContextRegistryPageBoundary>
                    </KangurScoreSyncProvider>
                  </KangurProgressSyncProvider>
                </KangurAgeGroupFocusProvider>
              </KangurSubjectFocusProvider>
            </KangurAuthProvider>
          </KangurLoginModalProvider>
        </KangurGuestPlayerProvider>
      </KangurTopNavigationProvider>
    </KangurRouteTransitionProvider>
  );
}
