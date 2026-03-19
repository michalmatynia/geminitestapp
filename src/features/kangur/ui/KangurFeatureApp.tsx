'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { KangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/KangurCmsRuntimeScreen';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { getKangurHomeHref, resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';

const KangurAiTutorWidget = dynamic(() => import('@/features/kangur/ui/components/KangurAiTutorWidget').then(m => ({ default: m.KangurAiTutorWidget })), { ssr: false });
const KangurLoginModal = dynamic(() => import('@/features/kangur/ui/components/KangurLoginModal').then(m => ({ default: m.KangurLoginModal })), { ssr: false });
import { KangurRouteAccessibilityAnnouncer } from '@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer';
import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';
import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';
import { KangurAiTutorContentProvider } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurAiTutorProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';
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
import { cn } from '@/features/kangur/shared/utils';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import type { JSX } from 'react';

const BOOT_SKELETON_MIN_VISIBLE_MS = 280;
const NAVIGATION_SKELETON_DELAY_MS = 140;

const AuthenticatedApp = (): JSX.Element | null => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } =
    useKangurAuth();
  const {
    isLoading: isLoadingSettings,
    isFetching: isFetchingSettings,
  } = useSettingsStore();
  const {
    isRouteAcknowledging,
    isRoutePending,
    isRouteWaitingForReady,
    isRouteRevealing,
    transitionPhase,
    activeTransitionSourceId,
    pendingPageKey,
    activeTransitionPageKey,
    activeTransitionSkeletonVariant,
  } = useKangurRouteTransitionState();
  const routeNavigator = useKangurRouteNavigator();
  const { pageKey, embedded, requestedPath, basePath } = useKangurRouting();
  const authErrorType = authError?.type;
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const homeHref = getKangurHomeHref(basePath);
  const shouldRedirectToHome =
    !embedded &&
    !isLoadingAuth &&
    !isAuthenticated &&
    !authErrorType &&
    resolvedPageKey === 'ParentDashboard';
  const prefersReducedMotion = useReducedMotion();
  const routeContentMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');
  const isBootLoading = isLoadingPublicSettings || isLoadingAuth;
  const isThemeLoading = isLoadingSettings || isFetchingSettings;
  const canRenderRouteWhileLoading = resolvedPageKey === 'Game' || resolvedPageKey === 'Lessons';
  const shouldShowBootLoader = (isBootLoading && !canRenderRouteWhileLoading) || isThemeLoading;
  const isNavigationTransitionActive =
    isRouteAcknowledging || isRoutePending || isRouteWaitingForReady || isRouteRevealing;
  const shouldSkipNavigationSkeletonDelay = activeTransitionSourceId !== null;
  const shouldBlockRouteContent =
    isThemeLoading || (isBootLoading && !canRenderRouteWhileLoading) || shouldRedirectToHome;
  const [isBootSkeletonVisible, setIsBootSkeletonVisible] = useState<boolean>(shouldShowBootLoader);
  const [isNavigationSkeletonVisible, setIsNavigationSkeletonVisible] = useState<boolean>(false);
  const bootSkeletonShownAtRef = useRef<number | null>(
    shouldShowBootLoader ? Date.now() : null
  );
  const navigationSkeletonShownRef = useRef(false);
  const transitionPageKey =
    pendingPageKey ?? activeTransitionPageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;
  const isRouteSkeletonVisible = isNavigationSkeletonVisible;
  const isRouteContentVisuallyHidden =
    transitionPhase === 'waiting_for_ready' ||
    (transitionPhase === 'pending' && isRouteSkeletonVisible);

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
    if (isBootLoading) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
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
  ]);

  if (authErrorType === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

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

  return (
    <>
      <KangurRouteAccessibilityAnnouncer />
      <KangurTopNavigationHost />
      <KangurAppLoader visible={isBootSkeletonVisible} />
      <AnimatePresence mode='wait'>
        {routeContent ? (
          <motion.div
            key={routeTransitionKey}
            {...routeContentMotionProps}
            aria-busy={isNavigationTransitionActive}
            aria-hidden={isRouteContentVisuallyHidden ? 'true' : undefined}
            className={cn(
              'w-full min-w-0',
              embedded ? 'min-h-full' : 'min-h-screen min-h-[100svh] min-h-[100dvh]',
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
      <AnimatePresence>
        {isRouteSkeletonVisible ? (
          <motion.div
            key='kangur-page-transition-skeleton:navigation'
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          >
            <KangurPageTransitionSkeleton
              pageKey={transitionPageKey}
              reason='navigation'
              variant={activeTransitionSkeletonVariant}
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
                          <KangurAiTutorProvider>
                            <KangurTutorAnchorProvider>
                              <AuthenticatedApp />
                              <KangurAiTutorWidget />
                              <KangurLoginModal />
                            </KangurTutorAnchorProvider>
                          </KangurAiTutorProvider>
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
