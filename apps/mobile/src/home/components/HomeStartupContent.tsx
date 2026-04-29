import React from 'react';

import type { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  DeferredHomePrimaryStartupCard,
  DeferredHomeQuickAccessCard,
  DeferredHomeStartupSectionsCard,
} from '../home-screen-deferred';
import { type KangurHomeAuthBoundaryViewModel } from '../homeAuthBoundary';
import { HomeAccountSection } from './HomeAccountSection';
import { HomeNavigationSection } from './HomeNavigationSection';

export type HomeStartupContentProps = {
  shouldRenderCombinedHomePrimaryStartupPlaceholder: boolean;
  shouldRenderCombinedHomeStartupPlaceholder: boolean;
  shouldRenderCombinedHomeQuickAccessPlaceholder: boolean;
  apiBaseUrl: string;
  apiBaseUrlSource: string;
  areDeferredHomeAccountDetailsReady: boolean;
  areDeferredHomeAccountSignInReady: boolean;
  areDeferredHomeAccountSummaryReady: boolean;
  authBoundary: KangurHomeAuthBoundaryViewModel | null;
  authError: string | null;
  authMode: string;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  sessionStatus: 'authenticated' | 'anonymous';
  shouldShowLearnerCredentialsForm: boolean;
  handleSignIn: () => void;
  handleSignInWithLearnerCredentials: (l: string, p: string) => Promise<void>;
  handleSignOut: () => void;
  areDeferredHomeNavigationExtendedReady: boolean;
  areDeferredHomeNavigationSecondaryReady: boolean;
  canOpenParentDashboard: boolean;
};

export function HomeStartupContent({
  shouldRenderCombinedHomePrimaryStartupPlaceholder,
  shouldRenderCombinedHomeStartupPlaceholder,
  shouldRenderCombinedHomeQuickAccessPlaceholder,
  apiBaseUrl,
  apiBaseUrlSource,
  areDeferredHomeAccountDetailsReady,
  areDeferredHomeAccountSignInReady,
  areDeferredHomeAccountSummaryReady,
  authBoundary,
  authError,
  authMode,
  copy,
  sessionStatus,
  shouldShowLearnerCredentialsForm,
  handleSignIn,
  handleSignInWithLearnerCredentials,
  handleSignOut,
  areDeferredHomeNavigationExtendedReady,
  areDeferredHomeNavigationSecondaryReady,
  canOpenParentDashboard,
}: HomeStartupContentProps): React.JSX.Element {
  if (shouldRenderCombinedHomePrimaryStartupPlaceholder) return <DeferredHomePrimaryStartupCard />;
  if (shouldRenderCombinedHomeStartupPlaceholder) return <DeferredHomeStartupSectionsCard />;
  if (shouldRenderCombinedHomeQuickAccessPlaceholder) return <DeferredHomeQuickAccessCard />;

  return (
    <>
      <HomeAccountSection
        apiBaseUrl={apiBaseUrl}
        apiBaseUrlSource={apiBaseUrlSource}
        areDeferredHomeAccountDetailsReady={areDeferredHomeAccountDetailsReady}
        areDeferredHomeAccountSignInReady={areDeferredHomeAccountSignInReady}
        areDeferredHomeAccountSummaryReady={areDeferredHomeAccountSummaryReady}
        authBoundary={authBoundary}
        authError={authError}
        authMode={authMode}
        copy={copy}
        sessionStatus={sessionStatus}
        shouldShowLearnerCredentialsForm={shouldShowLearnerCredentialsForm}
        signIn={handleSignIn}
        signInWithLearnerCredentials={handleSignInWithLearnerCredentials}
        signOut={handleSignOut}
      />
      <HomeNavigationSection
        areDeferredHomeNavigationExtendedReady={areDeferredHomeNavigationExtendedReady}
        areDeferredHomeNavigationSecondaryReady={areDeferredHomeNavigationSecondaryReady}
        canOpenParentDashboard={canOpenParentDashboard}
        copy={copy}
      />
    </>
  );
}
