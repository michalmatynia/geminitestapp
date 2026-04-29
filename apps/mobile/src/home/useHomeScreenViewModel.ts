import { type KangurAuthSession } from '@kangur/platform';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useHomeScreenAuthViewModel } from './useHomeScreenAuthViewModel';
import { useHomeScreenDeferredStates } from './useHomeScreenDeferredStates';
import { useHomeScreenPlaceholderViewModel } from './useHomeScreenPlaceholderViewModel';
import { type KangurHomeAuthBoundaryViewModel } from './homeAuthBoundary';

export function useHomeScreenViewModel(): {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  apiBaseUrl: string;
  apiBaseUrlSource: string;
  authError: string | null;
  authMode: string;
  session: KangurAuthSession;
  isLoadingAuth: boolean;
  signIn: () => void;
  signInWithLearnerCredentials: (l: string, p: string) => Promise<void>;
  signOut: () => void;
  supportsLearnerCredentials: boolean;
  isRestoringLearnerSession: boolean;
  shouldShowLearnerCredentialsForm: boolean;
  authBoundary: KangurHomeAuthBoundaryViewModel | null;
  homeHeroLearnerName: string | null;
  canOpenParentDashboard: boolean;
  activeDuelLearnerId: string | null;
  areDeferredHomePanelsReady: boolean;
  areDeferredHomeDuelSecondaryReady: boolean;
  areDeferredHomeDuelInvitesReady: boolean;
  areDeferredHomeDuelAdvancedReady: boolean;
  areDeferredHomeInsightsReady: boolean;
  areDeferredHomeScoreRefreshReady: boolean;
  areDeferredHomeHeroScoresReady: boolean;
  areDeferredHomeTrainingFocusDetailsReady: boolean;
  areDeferredHomeHeroIntroReady: boolean;
  areDeferredHomeHeroDetailsReady: boolean;
  areDeferredHomeAccountSummaryReady: boolean;
  areDeferredHomeAccountDetailsReady: boolean;
  areDeferredHomeAccountSignInReady: boolean;
  areDeferredHomeNavigationSecondaryReady: boolean;
  areDeferredHomeNavigationExtendedReady: boolean;
  shouldRenderCombinedHomeQuickAccessPlaceholder: boolean;
  shouldRenderCombinedHomeStartupPlaceholder: boolean;
  shouldRenderCombinedHomeHeroPlaceholder: boolean;
  shouldRenderCombinedHomePrimaryStartupPlaceholder: boolean;
} {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiBaseUrlSource } = useKangurMobileRuntime();
  const deferredStates = useHomeScreenDeferredStates();
  const authViewModel = useHomeScreenAuthViewModel(deferredStates.areDeferredHomeAccountSummaryReady);
  const placeholderViewModel = useHomeScreenPlaceholderViewModel(deferredStates);

  return {
    copy,
    apiBaseUrl,
    apiBaseUrlSource,
    ...deferredStates,
    ...authViewModel,
    ...placeholderViewModel,
  };
}
