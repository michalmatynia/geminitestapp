import type {
  KangurAuthAdapter,
  KangurAuthSession,
  KangurAuthTransitionInput,
} from '@kangur/platform';
import { createAnonymousKangurAuthSession } from '@kangur/platform';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  createLearnerSessionKangurAuthAdapter,
  KANGUR_MOBILE_AUTH_ERROR_CODES,
} from './createLearnerSessionKangurAuthAdapter';
import { createDevelopmentKangurAuthAdapter } from './createDevelopmentKangurAuthAdapter';
import { invalidateKangurMobileAuthQueries } from './invalidateKangurMobileAuthQueries';
import {
  type KangurMobileAuthMode,
} from './mobileAuthMode';
import { resolveKangurMobileDeveloperConfig } from '../config/mobileDeveloperConfig';
import { resolveKangurMobilePublicConfig } from '../config/mobilePublicConfig';
import { type KangurMobileLocale, useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type KangurMobileAuthContextValue = {
  authError: string | null;
  authMode: KangurMobileAuthMode;
  developerAutoSignInEnabled: boolean;
  hasAttemptedDeveloperAutoSignIn: boolean;
  session: KangurAuthSession;
  isLoadingAuth: boolean;
  refreshSession: () => Promise<void>;
  signIn: (input?: KangurAuthTransitionInput) => Promise<void>;
  signInWithLearnerCredentials: (
    loginName: string,
    password: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  supportsLearnerCredentials: boolean;
};

const KangurMobileAuthContext =
  createContext<KangurMobileAuthContextValue | null>(null);

const resolveAuthErrorCode = (error: unknown): string | null =>
  typeof error === 'object' &&
  error &&
  'code' in error &&
  typeof error.code === 'string'
    ? error.code
    : null;

const toAuthErrorMessage = (
  error: unknown,
  locale: KangurMobileLocale,
): string => {
  if (!(error instanceof Error)) {
    return {
      de: 'Die Lernenden-Sitzung konnte nicht aktualisiert werden.',
      en: 'Could not refresh the learner session.',
      pl: 'Nie udało się odświeżyć sesji ucznia.',
    }[locale];
  }

  const message = error.message.trim();
  const errorCode = resolveAuthErrorCode(error);
  if (!message) {
    return {
      de: 'Die Lernenden-Sitzung konnte nicht aktualisiert werden.',
      en: 'Could not refresh the learner session.',
      pl: 'Nie udało się odświeżyć sesji ucznia.',
    }[locale];
  }

  if (errorCode === KANGUR_MOBILE_AUTH_ERROR_CODES.missingCredentials) {
    return {
      de: 'Gib den Lernenden-Login und das Passwort ein, um dich anzumelden.',
      en: 'Enter the learner login and password to sign in.',
      pl: 'Podaj login i hasło ucznia, aby się zalogować.',
    }[locale];
  }

  if (errorCode === KANGUR_MOBILE_AUTH_ERROR_CODES.missingPersistedSession) {
    return {
      de: 'Die Lernenden-Sitzung konnte auf diesem Gerät nicht gespeichert werden. Prüfe die Cookie- und Sitzungsunterstützung der aktuellen Laufzeit.',
      en: 'The learner session could not be persisted on this device. Check cookie and session support for the current runtime.',
      pl: 'Sesja ucznia nie została zapisana na tym urządzeniu. Sprawdź obsługę cookies i sesji w aktualnym środowisku.',
    }[locale];
  }

  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage === 'failed to fetch' || normalizedMessage.includes('networkerror')) {
    return {
      de: 'Die Verbindung zur Kangur-API konnte nicht hergestellt werden.',
      en: 'Could not connect to the Kangur API.',
      pl: 'Nie udało się połączyć z API Kangura.',
    }[locale];
  }

  return message;
};

export function KangurMobileAuthProvider({
  children,
  adapter,
}: PropsWithChildren<{ adapter?: KangurAuthAdapter }>): React.JSX.Element {
  const { apiClient, storage } = useKangurMobileRuntime();
  const { locale } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const authMode = resolveKangurMobilePublicConfig().authMode;
  const developerConfig = resolveKangurMobileDeveloperConfig();
  const supportsLearnerCredentials = authMode === 'learner-session';
  const hasAttemptedDeveloperAutoSignInRef = useRef(false);
  const [hasAttemptedDeveloperAutoSignIn, setHasAttemptedDeveloperAutoSignIn] =
    useState(false);
  const developerAutoSignInEnabled =
    supportsLearnerCredentials &&
    developerConfig.autoSignIn &&
    Boolean(developerConfig.learnerLoginName) &&
    Boolean(developerConfig.learnerPassword);
  const [authAdapter] = useState<KangurAuthAdapter>(
    () =>
      adapter ??
      (authMode === 'learner-session'
        ? createLearnerSessionKangurAuthAdapter({
            apiClient,
            storage,
          })
        : createDevelopmentKangurAuthAdapter(storage)),
  );
  const [session, setSession] = useState<KangurAuthSession>(() =>
    createAnonymousKangurAuthSession(
      authMode === 'learner-session'
        ? 'native-learner-session'
        : 'native-development',
    ),
  );
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = async (): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await authAdapter.getSession();
      setSession(nextSession);
      await invalidateKangurMobileAuthQueries(queryClient);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signIn = async (input?: KangurAuthTransitionInput): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await authAdapter.signIn(input);
      setSession(nextSession);
      await invalidateKangurMobileAuthQueries(queryClient);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await authAdapter.signOut();
      setSession(nextSession);
      await invalidateKangurMobileAuthQueries(queryClient);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signInWithLearnerCredentials = async (
    loginName: string,
    password: string,
  ): Promise<void> =>
    signIn({
      learnerCredentials: {
        loginName,
        password,
      },
    });

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (
      !developerAutoSignInEnabled ||
      isLoadingAuth ||
      session.status === 'authenticated' ||
      hasAttemptedDeveloperAutoSignInRef.current
    ) {
      return;
    }

    hasAttemptedDeveloperAutoSignInRef.current = true;
    setHasAttemptedDeveloperAutoSignIn(true);
    void signInWithLearnerCredentials(
      developerConfig.learnerLoginName!,
      developerConfig.learnerPassword!,
    );
  }, [
    developerAutoSignInEnabled,
    developerConfig.learnerLoginName,
    developerConfig.learnerPassword,
    isLoadingAuth,
    session.status,
    supportsLearnerCredentials,
  ]);

  const value = useMemo<KangurMobileAuthContextValue>(
    () => ({
      authError,
      authMode,
      developerAutoSignInEnabled,
      hasAttemptedDeveloperAutoSignIn,
      session,
      isLoadingAuth,
      refreshSession,
      signIn,
      signInWithLearnerCredentials,
      signOut,
      supportsLearnerCredentials,
    }),
    [
      authError,
      authMode,
      developerAutoSignInEnabled,
      hasAttemptedDeveloperAutoSignIn,
      isLoadingAuth,
      locale,
      session,
      supportsLearnerCredentials,
    ],
  );

  return (
    <KangurMobileAuthContext.Provider value={value}>
      {children}
    </KangurMobileAuthContext.Provider>
  );
}

export function useKangurMobileAuth(): KangurMobileAuthContextValue {
  const context = useContext(KangurMobileAuthContext);
  if (!context) {
    throw new Error(
      'useKangurMobileAuth must be used inside KangurMobileAuthProvider.',
    );
  }
  return context;
}
