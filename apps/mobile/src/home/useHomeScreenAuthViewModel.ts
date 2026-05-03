import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { resolveHomeHeroLearnerName } from './resolveHomeHeroLearnerName';
import { type KangurAuthSession } from '@kangur/platform';
import { useHomeScreenAuthBoundaryViewModel } from './useHomeScreenAuthBoundaryViewModel';
import { type KangurHomeAuthBoundaryViewModel } from './homeAuthBoundary';
import { useHomeScreenAuthActions } from './useHomeScreenAuthActions';
import { useHomeScreenAuthStatusViewModel } from './useHomeScreenAuthStatusViewModel';

export type HomeScreenAuthViewModel = {
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
};

export function useHomeScreenAuthViewModel(
  areDeferredHomeAccountSummaryReady: boolean,
): HomeScreenAuthViewModel {
  const {
    authError,
    authMode,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();

  const actions = useHomeScreenAuthActions();

  const authBoundary = useHomeScreenAuthBoundaryViewModel({
    areDeferredHomeAccountSummaryReady,
    authError,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    supportsLearnerCredentials,
  });

  const statusViewModel = useHomeScreenAuthStatusViewModel({
    isLoadingAuth,
    session,
    supportsLearnerCredentials,
  });

  return {
    authError,
    authMode,
    session,
    isLoadingAuth,
    signIn: actions.handleSignIn,
    signInWithLearnerCredentials: actions.handleSignInWithLearnerCredentials,
    signOut: actions.handleSignOut,
    supportsLearnerCredentials,
    authBoundary,
    homeHeroLearnerName: resolveHomeHeroLearnerName(session.user),
    ...statusViewModel,
  };
}
