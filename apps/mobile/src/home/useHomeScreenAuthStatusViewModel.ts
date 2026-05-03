import { type KangurAuthSession } from '@kangur/platform';
import { useHomeScreenAuthCoreStatusViewModel } from './useHomeScreenAuthCoreStatusViewModel';
import { useHomeScreenAuthDerivedStatusViewModel } from './useHomeScreenAuthDerivedStatusViewModel';

export function useHomeScreenAuthStatusViewModel({
  isLoadingAuth,
  session,
  supportsLearnerCredentials,
}: {
  isLoadingAuth: boolean;
  session: KangurAuthSession;
  supportsLearnerCredentials: boolean;
}): {
  isRestoringLearnerSession: boolean;
  shouldShowLearnerCredentialsForm: boolean;
  canOpenParentDashboard: boolean;
  activeDuelLearnerId: string | null;
} {
  const coreStatus = useHomeScreenAuthCoreStatusViewModel({
    isLoadingAuth,
    session,
  });

  const { shouldShowLearnerCredentialsForm } = useHomeScreenAuthDerivedStatusViewModel({
    isRestoringLearnerSession: coreStatus.isRestoringLearnerSession,
    session,
    supportsLearnerCredentials,
  });

  return {
    ...coreStatus,
    shouldShowLearnerCredentialsForm,
  };
}
