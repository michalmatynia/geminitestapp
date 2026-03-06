'use client';

import type { JSX } from 'react';

import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';
import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';
import { KANGUR_MAIN_PAGE, kangurPages } from '@/features/kangur/config/pages';
import { resolveKangurPageKey } from '@/features/kangur/config/routing';
import { KangurAuthProvider, useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

const AuthenticatedApp = (): JSX.Element | null => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useKangurAuth();
  const { pageKey } = useKangurRouting();
  const authErrorType = authError?.type;

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className='fixed inset-0 flex items-center justify-center'>
        <div className='w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin'></div>
      </div>
    );
  }

  if (authErrorType === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authErrorType === 'auth_required') {
    navigateToLogin();
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

  return <ResolvedPage />;
};

export function KangurFeatureApp(): JSX.Element {
  return (
    <KangurAuthProvider>
      <KangurProgressSyncProvider>
        <AuthenticatedApp />
      </KangurProgressSyncProvider>
    </KangurAuthProvider>
  );
}
