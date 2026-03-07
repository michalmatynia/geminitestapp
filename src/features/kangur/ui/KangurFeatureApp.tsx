'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { JSX } from 'react';
import { useEffect } from 'react';

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

const AuthenticatedApp = (): JSX.Element | null => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useKangurAuth();
  const { pageKey, embedded } = useKangurRouting();
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
    return (
      <div
        className={embedded ? 'absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center' : 'fixed inset-0 flex items-center justify-center'}
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

  return <KangurCmsRuntimeScreen pageKey={resolvedPageKey} fallback={<ResolvedPage />} />;
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
