import type { KangurAuthSession } from '@kangur/platform';

export type KangurHomeAuthBoundaryViewModel = {
  developerAutoSignInLabel: string | null;
  isRestoringLearnerSession: boolean;
  showLearnerCredentialsForm: boolean;
  statusLabel: string;
  userLabel: string;
};

export const getKangurHomeAuthBoundaryViewModel = ({
  authError,
  developerAutoSignInEnabled,
  hasAttemptedDeveloperAutoSignIn,
  isLoadingAuth,
  session,
  supportsLearnerCredentials,
}: {
  authError: string | null;
  developerAutoSignInEnabled: boolean;
  hasAttemptedDeveloperAutoSignIn: boolean;
  isLoadingAuth: boolean;
  session: KangurAuthSession;
  supportsLearnerCredentials: boolean;
}): KangurHomeAuthBoundaryViewModel => {
  const isRestoringLearnerSession =
    isLoadingAuth && session.status !== 'authenticated';

  return {
    developerAutoSignInLabel: !developerAutoSignInEnabled
      ? null
      : session.status === 'authenticated'
        ? 'authenticated'
        : hasAttemptedDeveloperAutoSignIn
          ? isLoadingAuth
            ? 'attempting'
            : authError
              ? 'failed'
              : 'attempted'
          : isLoadingAuth
            ? 'waiting'
            : 'ready',
    isRestoringLearnerSession,
    showLearnerCredentialsForm:
      supportsLearnerCredentials &&
      !isRestoringLearnerSession &&
      session.status !== 'authenticated',
    statusLabel: isRestoringLearnerSession
      ? 'restoring'
      : isLoadingAuth
        ? 'loading'
        : session.status,
    userLabel: isRestoringLearnerSession
      ? 'restoring learner session'
      : session.user
        ? `${session.user.full_name} (${session.user.actorType})`
        : 'anonymous',
  };
};
