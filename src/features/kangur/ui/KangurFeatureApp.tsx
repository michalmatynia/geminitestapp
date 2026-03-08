'use client';

import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';

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
import { cn } from '@/shared/utils';

type KangurRouteTransitionClass =
  | 'kangur-route-content-enter-a'
  | 'kangur-route-content-enter-b';

const toggleRouteTransitionClass = (
  current: KangurRouteTransitionClass
): KangurRouteTransitionClass =>
  current === 'kangur-route-content-enter-a'
    ? 'kangur-route-content-enter-b'
    : 'kangur-route-content-enter-a';

const AuthenticatedApp = (): JSX.Element | null => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useKangurAuth();
  const { pageKey, embedded, requestedPath } = useKangurRouting();
  const { isRoutePending } = useKangurRouteTransition();
  const authErrorType = authError?.type;
  const [routeTransitionClass, setRouteTransitionClass] =
    useState<KangurRouteTransitionClass>('kangur-route-content-enter-a');
  const previousRequestedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedPath) {
      return;
    }

    if (previousRequestedPathRef.current === null) {
      previousRequestedPathRef.current = requestedPath;
      return;
    }

    if (previousRequestedPathRef.current !== requestedPath) {
      setRouteTransitionClass(toggleRouteTransitionClass);
    }

    previousRequestedPathRef.current = requestedPath;
  }, [requestedPath]);

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
      <div
        aria-busy={isRoutePending}
        className={cn(
          routeTransitionClass,
          embedded ? 'min-h-full' : 'min-h-screen',
          isRoutePending && 'pointer-events-none select-none'
        )}
        data-testid='kangur-route-content'
      >
        {routeContent}
      </div>
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
                <KangurAiTutorProvider>
                  <KangurTutorAnchorProvider>
                    <AuthenticatedApp />
                    <KangurAiTutorWidget />
                    <KangurLoginModal />
                  </KangurTutorAnchorProvider>
                </KangurAiTutorProvider>
              </KangurScoreSyncProvider>
            </KangurProgressSyncProvider>
          </KangurAuthProvider>
        </KangurLoginModalProvider>
      </KangurTopNavigationProvider>
    </KangurRouteTransitionProvider>
  );
}
