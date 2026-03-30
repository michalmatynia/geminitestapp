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
import { InteractionManager } from 'react-native';

import {
  createLearnerSessionKangurAuthAdapter,
  KANGUR_MOBILE_AUTH_ERROR_CODES,
} from './createLearnerSessionKangurAuthAdapter';
import { createDevelopmentKangurAuthAdapter } from './createDevelopmentKangurAuthAdapter';
import { hasKangurMobileAuthQueryIdentityChanged } from './hasKangurMobileAuthQueryIdentityChanged';
import { hasKangurMobileAuthSessionPayloadChanged } from './hasKangurMobileAuthSessionPayloadChanged';
import { invalidateKangurMobileAuthQueries } from './invalidateKangurMobileAuthQueries';
import { KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY } from './mobileAuthStorageKeys';
import { resolvePersistedKangurMobileLearnerSession } from './persistedKangurMobileLearnerSession';
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

const AUTH_INITIAL_BACKGROUND_REFRESH_FALLBACK_TIMEOUT_MS = 220;

const scheduleInitialAuthRefreshFrame = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const frameId = requestAnimationFrame(() => {
      callback();
    });

    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
    };
  }

  const timeoutId = setTimeout(callback, 16);
  return () => {
    clearTimeout(timeoutId);
  };
};

const hasPersistedLearnerSessionHint = (
  storage: ReturnType<typeof useKangurMobileRuntime>['storage'],
): boolean =>
  storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY) === 'authenticated';

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
      de: 'Die Anmeldung konnte nicht aktualisiert werden.',
      en: 'Could not refresh sign-in.',
      pl: 'Nie udało się odświeżyć logowania.',
    }[locale];
  }

  const message = error.message.trim();
  const errorCode = resolveAuthErrorCode(error);
  if (!message) {
    return {
      de: 'Die Anmeldung konnte nicht aktualisiert werden.',
      en: 'Could not refresh sign-in.',
      pl: 'Nie udało się odświeżyć logowania.',
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
      de: 'Die Anmeldung konnte auf diesem Gerät nicht gespeichert werden. Prüfe Cookie- und Login-Unterstützung der aktuellen Laufzeit.',
      en: 'Sign-in could not be saved on this device. Check cookie and sign-in support for the current runtime.',
      pl: 'Logowanie nie zostało zapisane na tym urządzeniu. Sprawdź obsługę cookies i logowania w aktualnym środowisku.',
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
  const [initialBootState] = useState<{
    persistedLearnerSession: KangurAuthSession | null;
    shouldBlockInitialSessionRefresh: boolean;
  }>(() => {
    const persistedLearnerSession =
      authMode === 'learner-session'
        ? resolvePersistedKangurMobileLearnerSession(storage)
        : null;

    return {
      persistedLearnerSession,
      shouldBlockInitialSessionRefresh:
        authMode === 'learner-session' &&
        hasPersistedLearnerSessionHint(storage) &&
        persistedLearnerSession === null,
    };
  });
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
    initialBootState.persistedLearnerSession ??
    createAnonymousKangurAuthSession(
      authMode === 'learner-session'
        ? 'native-learner-session'
        : 'native-development',
    ),
  );
  const sessionRef = useRef(session);
  const [isLoadingAuth, setIsLoadingAuth] = useState(
    initialBootState.shouldBlockInitialSessionRefresh,
  );
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applyResolvedSession = async (
    nextSession: KangurAuthSession,
  ): Promise<void> => {
    const previousSession = sessionRef.current;
    if (
      hasKangurMobileAuthSessionPayloadChanged(previousSession, nextSession)
    ) {
      sessionRef.current = nextSession;
      setSession(nextSession);
    }

    if (
      hasKangurMobileAuthQueryIdentityChanged(previousSession, nextSession)
    ) {
      await invalidateKangurMobileAuthQueries(queryClient);
    }
  };

  const refreshSession = async (
    options: {
      blockUI?: boolean;
    } = {},
  ): Promise<void> => {
    const shouldBlockUI = options.blockUI ?? true;
    if (shouldBlockUI) {
      setIsLoadingAuth(true);
    }

    try {
      setAuthError(null);
      const nextSession = await authAdapter.getSession();
      await applyResolvedSession(nextSession);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      if (shouldBlockUI) {
        setIsLoadingAuth(false);
      }
    }
  };

  const signIn = async (input?: KangurAuthTransitionInput): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await authAdapter.signIn(input);
      await applyResolvedSession(nextSession);
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
      await applyResolvedSession(nextSession);
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
    if (initialBootState.shouldBlockInitialSessionRefresh) {
      void refreshSession({
        blockUI: true,
      });
      return;
    }

    let isDisposed = false;
    let hasScheduledRefresh = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelFrame = () => {};

    const clearFallbackTimeout = (): void => {
      if (fallbackTimeoutId === null) {
        return;
      }

      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    };

    const scheduleRefresh = (): void => {
      if (isDisposed || hasScheduledRefresh) {
        return;
      }

      hasScheduledRefresh = true;
      clearFallbackTimeout();
      cancelFrame = scheduleInitialAuthRefreshFrame(() => {
        if (isDisposed) {
          return;
        }

        void refreshSession({
          blockUI: false,
        });
      });
    };

    const interactionTask = InteractionManager.runAfterInteractions(
      scheduleRefresh,
    );
    fallbackTimeoutId = setTimeout(
      scheduleRefresh,
      AUTH_INITIAL_BACKGROUND_REFRESH_FALLBACK_TIMEOUT_MS,
    );

    return () => {
      isDisposed = true;
      clearFallbackTimeout();
      interactionTask.cancel?.();
      cancelFrame();
    };
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
