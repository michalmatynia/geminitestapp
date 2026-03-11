'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { KangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/KangurCmsRuntimeScreen';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurAiTutorWidget } from '@/features/kangur/ui/components/KangurAiTutorWidget';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurLoginModal } from '@/features/kangur/ui/components/KangurLoginModal';
import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { KangurRouteAccessibilityAnnouncer } from '@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer';
import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';
import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';
import { KangurAiTutorContentProvider } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurAiTutorProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurContextRegistryPageBoundary } from '@/features/kangur/ui/context/KangurContextRegistryPageBoundary';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLoginModalProvider } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurScoreSyncProvider } from '@/features/kangur/ui/context/KangurScoreSyncProvider';
import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/shared/utils';

import type { JSX } from 'react';

const APP_LOADER_MIN_VISIBLE_MS = 280;
const NAVIGATION_SKELETON_DELAY_MS = 140;

const AuthenticatedApp = (): JSX.Element | null => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useKangurAuth();
  const { isRoutePending, isRouteRevealing, pendingPageKey, activeTransitionPageKey } =
    useKangurRouteTransitionState();
  const { pageKey, embedded, requestedPath } = useKangurRouting();
  const authErrorType = authError?.type;
  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  const canRenderRouteWhileLoading = resolvedPageKey === 'Lessons';
  const prefersReducedMotion = useReducedMotion();
  const routeContentMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');
  const isBootLoading = isLoadingPublicSettings || isLoadingAuth;
  const isNavigationTransitionActive = isRoutePending || isRouteRevealing;
  const shouldBlockRouteContent = isBootLoading && !canRenderRouteWhileLoading;
  const [isLoaderVisible, setIsLoaderVisible] = useState<boolean>(isBootLoading);
  const [isNavigationSkeletonVisible, setIsNavigationSkeletonVisible] = useState<boolean>(false);
  const loaderShownAtRef = useRef<number | null>(isBootLoading ? Date.now() : null);
  const navigationSkeletonShownRef = useRef(false);
  const transitionPageKey =
    pendingPageKey ?? activeTransitionPageKey ?? resolvedPageKey ?? KANGUR_MAIN_PAGE;

  useEffect(() => {
    if (authErrorType === 'auth_required') {
      navigateToLogin();
    }
  }, [authErrorType, navigateToLogin]);

  useEffect(() => {
    if (isBootLoading) {
      if (loaderShownAtRef.current === null) {
        loaderShownAtRef.current = Date.now();
      }
      setIsLoaderVisible(true);
      return;
    }

    const shownAt = loaderShownAtRef.current;
    if (shownAt === null) {
      setIsLoaderVisible(false);
      return;
    }

    const remainingMs = Math.max(0, APP_LOADER_MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timeoutId = window.setTimeout(() => {
      loaderShownAtRef.current = null;
      setIsLoaderVisible(false);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isBootLoading]);

  useEffect(() => {
    if (isBootLoading) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
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

    if (isRouteRevealing) {
      setIsNavigationSkeletonVisible(navigationSkeletonShownRef.current);
      return;
    }

    if (!isNavigationTransitionActive) {
      navigationSkeletonShownRef.current = false;
      setIsNavigationSkeletonVisible(false);
      return;
    }

    return undefined;
  }, [isBootLoading, isNavigationTransitionActive, isRoutePending, isRouteRevealing]);

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
      <AnimatePresence mode='wait'>
        {routeContent ? (
          <motion.div
            key={routeTransitionKey}
            {...routeContentMotionProps}
            aria-busy={isNavigationTransitionActive}
            className={cn(embedded ? 'min-h-full' : 'min-h-screen')}
            data-route-transition-key={routeTransitionKey}
            data-testid='kangur-route-content'
          >
            {routeContent}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {isNavigationSkeletonVisible ? (
          <motion.div
            key='kangur-page-transition-skeleton'
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          >
            <KangurPageTransitionSkeleton pageKey={transitionPageKey} reason='navigation' />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <KangurAppLoader visible={isLoaderVisible} />
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
            </KangurAuthProvider>
          </KangurLoginModalProvider>
        </KangurGuestPlayerProvider>
      </KangurTopNavigationProvider>
    </KangurRouteTransitionProvider>
  );
}
