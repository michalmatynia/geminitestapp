import { type KangurAuthSession } from '@kangur/platform';
import { resolveHomeScreenActiveDuelLearnerId } from './resolveHomeScreenActiveDuelLearnerId';

export function useHomeScreenAuthCoreStatusViewModel({
  isLoadingAuth,
  session,
}: {
  isLoadingAuth: boolean;
  session: KangurAuthSession;
}): {
  isRestoringLearnerSession: boolean;
  canOpenParentDashboard: boolean;
  activeDuelLearnerId: string | null;
} {
  const isRestoringLearnerSession = isLoadingAuth && session.status !== 'authenticated';

  const canOpenParentDashboard =
    session.status === 'authenticated' && Boolean(session.user?.canManageLearners);

  const activeDuelLearnerId = resolveHomeScreenActiveDuelLearnerId(session.user);

  return {
    isRestoringLearnerSession,
    canOpenParentDashboard,
    activeDuelLearnerId,
  };
}
