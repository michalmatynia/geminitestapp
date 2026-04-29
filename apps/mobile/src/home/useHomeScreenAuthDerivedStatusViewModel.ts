import { type KangurAuthSession } from '@kangur/platform';

export function useHomeScreenAuthDerivedStatusViewModel({
  isRestoringLearnerSession,
  session,
  supportsLearnerCredentials,
}: {
  isRestoringLearnerSession: boolean;
  session: KangurAuthSession;
  supportsLearnerCredentials: boolean;
}): {
  shouldShowLearnerCredentialsForm: boolean;
} {
  const shouldShowLearnerCredentialsForm =
    supportsLearnerCredentials &&
    !isRestoringLearnerSession &&
    session.status !== 'authenticated';

  return {
    shouldShowLearnerCredentialsForm,
  };
}
