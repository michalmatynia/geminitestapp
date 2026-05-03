import { type KangurAuthSession } from '@kangur/platform';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  getKangurHomeAuthBoundaryViewModel,
  type KangurHomeAuthBoundaryViewModel,
} from './homeAuthBoundary';

export function useHomeScreenAuthBoundaryViewModel({
  areDeferredHomeAccountSummaryReady,
  authError,
  developerAutoSignInEnabled,
  hasAttemptedDeveloperAutoSignIn,
  isLoadingAuth,
  session,
  supportsLearnerCredentials,
}: {
  areDeferredHomeAccountSummaryReady: boolean;
  authError: string | null;
  developerAutoSignInEnabled: boolean;
  hasAttemptedDeveloperAutoSignIn: boolean;
  isLoadingAuth: boolean;
  session: KangurAuthSession;
  supportsLearnerCredentials: boolean;
}): KangurHomeAuthBoundaryViewModel | null {
  const { locale } = useKangurMobileI18n();

  if (!areDeferredHomeAccountSummaryReady) return null;

  return getKangurHomeAuthBoundaryViewModel({
    authError,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    locale,
    session,
    supportsLearnerCredentials,
  });
}
