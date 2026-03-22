import type { KangurAuthSession } from '@kangur/platform';

import {
  getKangurMobileLocalizedValue,
  type KangurMobileLocale,
} from '../i18n/kangurMobileI18n';

export type KangurHomeAuthBoundaryViewModel = {
  developerAutoSignInLabel: string | null;
  isRestoringLearnerSession: boolean;
  showLearnerCredentialsForm: boolean;
  statusLabel: string;
  userLabel: string;
};

const STATUS_LABELS = {
  anonymous: {
    de: 'anonym',
    en: 'anonymous',
    pl: 'anonimowy',
  },
  authenticated: {
    de: 'angemeldet',
    en: 'signed in',
    pl: 'zalogowany',
  },
  loading: {
    de: 'laden',
    en: 'loading',
    pl: 'ladowanie',
  },
  restoring: {
    de: 'wird wiederhergestellt',
    en: 'restoring',
    pl: 'przywracanie',
  },
} as const;

const ACTOR_TYPE_LABELS = {
  admin: {
    de: 'admin',
    en: 'admin',
    pl: 'admin',
  },
  learner: {
    de: 'schuler',
    en: 'learner',
    pl: 'uczen',
  },
  parent: {
    de: 'elternteil',
    en: 'parent',
    pl: 'rodzic',
  },
} as const;

const RESTORING_SESSION_LABEL = {
  de: 'wiederherstellung der anmeldung',
  en: 'restoring sign-in',
  pl: 'przywracanie logowania',
} as const;

export const getKangurHomeAuthBoundaryViewModel = ({
  authError,
  developerAutoSignInEnabled,
  hasAttemptedDeveloperAutoSignIn,
  isLoadingAuth,
  locale = 'pl',
  session,
  supportsLearnerCredentials,
}: {
  authError: string | null;
  developerAutoSignInEnabled: boolean;
  hasAttemptedDeveloperAutoSignIn: boolean;
  isLoadingAuth: boolean;
  locale?: KangurMobileLocale;
  session: KangurAuthSession;
  supportsLearnerCredentials: boolean;
}): KangurHomeAuthBoundaryViewModel => {
  const isRestoringLearnerSession =
    isLoadingAuth && session.status !== 'authenticated';
  const statusLabel = getKangurMobileLocalizedValue(
    isRestoringLearnerSession
      ? STATUS_LABELS.restoring
      : isLoadingAuth
        ? STATUS_LABELS.loading
        : session.status === 'authenticated'
          ? STATUS_LABELS.authenticated
          : STATUS_LABELS.anonymous,
    locale,
  );
  const actorTypeLabel =
    session.user?.actorType === 'learner'
      ? ACTOR_TYPE_LABELS['learner'][locale]
      : session.user?.actorType === 'parent'
        ? ACTOR_TYPE_LABELS['parent'][locale]
      : session.user?.actorType === 'admin'
          ? ACTOR_TYPE_LABELS['admin'][locale]
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
      ? getKangurMobileLocalizedValue(RESTORING_SESSION_LABEL, locale)
      : session.user
        ? `${session.user.full_name} (${actorTypeLabel})`
        : getKangurMobileLocalizedValue(STATUS_LABELS.anonymous, locale),
  };
};
