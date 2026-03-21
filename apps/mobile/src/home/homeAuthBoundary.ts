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
  const statusLabel = isRestoringLearnerSession
    ? 'przywracanie'
    : isLoadingAuth
      ? 'ladowanie'
      : session.status === 'authenticated'
        ? 'zalogowany'
        : 'anonimowy';
  const actorTypeLabel =
    session.user?.actorType === 'learner'
      ? 'uczen'
      : session.user?.actorType === 'parent'
        ? 'rodzic'
        : session.user?.actorType === 'admin'
          ? 'admin'
          : session.user?.actorType ?? null;

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
    statusLabel,
    userLabel: isRestoringLearnerSession
      ? 'przywracanie sesji ucznia'
      : session.user
        ? `${session.user.full_name} (${actorTypeLabel})`
        : 'anonimowy',
  };
};
