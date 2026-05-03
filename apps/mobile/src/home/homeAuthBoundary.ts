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

function resolveStatusLabel(
  isRestoring: boolean,
  isLoading: boolean,
  status: string,
  locale: KangurMobileLocale,
): string {
  if (isRestoring) return getKangurMobileLocalizedValue(STATUS_LABELS.restoring, locale);
  if (isLoading) return getKangurMobileLocalizedValue(STATUS_LABELS.loading, locale);
  if (status === 'authenticated') return getKangurMobileLocalizedValue(STATUS_LABELS.authenticated, locale);
  return getKangurMobileLocalizedValue(STATUS_LABELS.anonymous, locale);
}

function resolveActorTypeLabel(
  actorType: string | undefined | null,
  locale: KangurMobileLocale,
): string | null {
  if (actorType === 'learner') return ACTOR_TYPE_LABELS.learner[locale];
  if (actorType === 'parent') return ACTOR_TYPE_LABELS.parent[locale];
  if (actorType === 'admin') return ACTOR_TYPE_LABELS.admin[locale];
  return actorType ?? null;
}

type DeveloperAutoSignInLabelProps = {
  authError: string | null;
  enabled: boolean;
  hasAttempted: boolean;
  isLoading: boolean;
  status: string;
};

function resolveDeveloperAutoSignInLabel({
  authError,
  enabled,
  hasAttempted,
  isLoading,
  status,
}: DeveloperAutoSignInLabelProps): string | null {
  if (!enabled) return null;
  if (status === 'authenticated') return 'authenticated';
  
  if (!hasAttempted) {
    return isLoading ? 'waiting' : 'ready';
  }
  
  if (isLoading) {
    return 'attempting';
  }
  
  return authError !== null ? 'failed' : 'attempted';
}

function resolveUserLabel(
  isRestoring: boolean,
  session: KangurAuthSession,
  actorTypeLabel: string | null,
  locale: KangurMobileLocale,
): string {
  if (isRestoring) {
    return getKangurMobileLocalizedValue(RESTORING_SESSION_LABEL, locale);
  }
  if (session.user) {
    return `${session.user.full_name} (${actorTypeLabel ?? '?'})`;
  }
  return getKangurMobileLocalizedValue(STATUS_LABELS.anonymous, locale);
}

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
  const isRestoringLearnerSession = isLoadingAuth && session.status !== 'authenticated';
  const statusLabel = resolveStatusLabel(isRestoringLearnerSession, isLoadingAuth, session.status, locale);
  const actorTypeLabel = resolveActorTypeLabel(session.user?.actorType, locale);

  const developerAutoSignInLabel = resolveDeveloperAutoSignInLabel({
    authError,
    enabled: developerAutoSignInEnabled,
    hasAttempted: hasAttemptedDeveloperAutoSignIn,
    isLoading: isLoadingAuth,
    status: session.status,
  });

  const userLabel = resolveUserLabel(isRestoringLearnerSession, session, actorTypeLabel, locale);

  return {
    developerAutoSignInLabel,
    isRestoringLearnerSession,
    showLearnerCredentialsForm:
      supportsLearnerCredentials &&
      !isRestoringLearnerSession &&
      session.status !== 'authenticated',
    statusLabel,
    userLabel,
  };
};
