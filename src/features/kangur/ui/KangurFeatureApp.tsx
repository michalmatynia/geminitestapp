'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { JSX } from 'react';
import { useEffect } from 'react';

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';
import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';
import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';
import { KangurAiTutorWidget } from '@/features/kangur/ui/components/KangurAiTutorWidget';
import { KangurLoginModal } from '@/features/kangur/ui/components/KangurLoginModal';
import { KangurRouteAccessibilityAnnouncer } from '@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/KangurCmsRuntimeScreen';
import { KangurAiTutorProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurLoginModalProvider } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import { KangurScoreSyncProvider } from '@/features/kangur/ui/context/KangurScoreSyncProvider';
import { KangurContextRegistryPageBoundary } from '@/features/kangur/ui/context/KangurContextRegistryPageBoundary';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransition,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/shared/utils';

const AuthenticatedApp = (): JSX.Element | null => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useKangurAuth();
  const { pageKey, embedded, requestedPath } = useKangurRouting();
  const { isRoutePending, pendingPageKey } = useKangurRouteTransition();
  const authErrorType = authError?.type;
  const prefersReducedMotion = useReducedMotion();
  const routeContentMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const routeTransitionKey = requestedPath || (pageKey ? `page:${pageKey}` : 'page:unknown');

  useEffect(() => {
    if (authErrorType === 'auth_required') {
      navigateToLogin();
    }
  }, [authErrorType, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <KangurPageTransitionSkeleton pageKey={pageKey ?? KANGUR_MAIN_PAGE} reason='boot' />;
  }

  if (authErrorType === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  let routeContent: JSX.Element | null = null;
  if (authErrorType !== 'auth_required') {
    const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
    if (!resolvedPageKey) {
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
      {isRoutePending ? (
        <KangurPageTransitionSkeleton
          pageKey={pendingPageKey ?? pageKey ?? KANGUR_MAIN_PAGE}
          reason='navigation'
        />
      ) : null}
      <AnimatePresence mode='wait'>
        {routeContent ? (
          <motion.div
            key={routeTransitionKey}
            {...routeContentMotionProps}
            aria-busy={isRoutePending}
            className={cn(
              embedded ? 'min-h-full' : 'min-h-screen',
              isRoutePending && 'pointer-events-none select-none'
            )}
            data-route-transition-key={routeTransitionKey}
            data-testid='kangur-route-content'
          >
            {routeContent}
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
        <KangurLoginModalProvider>
          <KangurAuthProvider>
            <KangurProgressSyncProvider>
              <KangurScoreSyncProvider>
                <KangurContextRegistryPageBoundary>
                  <KangurAiTutorProvider>
                    <KangurTutorAnchorProvider>
                      <AuthenticatedApp />
                      <KangurAiTutorWidget />
                      <KangurLoginModal />
                    </KangurTutorAnchorProvider>
                  </KangurAiTutorProvider>
                </KangurContextRegistryPageBoundary>
              </KangurScoreSyncProvider>
            </KangurProgressSyncProvider>
          </KangurAuthProvider>
        </KangurLoginModalProvider>
      </KangurTopNavigationProvider>
    </KangurRouteTransitionProvider>
  );
}
