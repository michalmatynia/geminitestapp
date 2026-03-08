'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';

import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';
import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';
import { KangurAiTutorWidget } from '@/features/kangur/ui/components/KangurAiTutorWidget';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurCmsRuntimeScreen } from '@/features/kangur/cms-builder/KangurCmsRuntimeScreen';
import { KangurAiTutorProvider } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

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

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div
        className={
          embedded
            ? 'absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm'
            : 'absolute inset-0 z-20 flex items-center justify-center bg-white/35 backdrop-blur-[2px]'
        }
      >
        <div className='w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin'></div>
      </div>
    );
  }

  if (authErrorType === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authErrorType === 'auth_required') {
    return null;
  }

  const resolvedPageKey = resolveKangurPageKey(pageKey, kangurPages, KANGUR_MAIN_PAGE);
  if (!resolvedPageKey) {
    return <PageNotFound />;
  }

  const ResolvedPage = kangurPages[resolvedPageKey];
  if (!ResolvedPage) {
    return <PageNotFound />;
  }

  return (
    <div
      className={routeTransitionClass}
      data-testid='kangur-route-content'
    >
      <KangurCmsRuntimeScreen pageKey={resolvedPageKey} fallback={<ResolvedPage />} />
    </div>
  );
};

export function KangurFeatureApp(): JSX.Element {
  return (
    <KangurAuthProvider>
      <KangurProgressSyncProvider>
        <KangurAiTutorProvider>
          <KangurTutorAnchorProvider>
            <AuthenticatedApp />
            <KangurAiTutorWidget />
          </KangurTutorAnchorProvider>
        </KangurAiTutorProvider>
      </KangurProgressSyncProvider>
    </KangurAuthProvider>
  );
}
