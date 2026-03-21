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

import { createLearnerSessionKangurAuthAdapter } from './createLearnerSessionKangurAuthAdapter';
import { createDevelopmentKangurAuthAdapter } from './createDevelopmentKangurAuthAdapter';
import { invalidateKangurMobileAuthQueries } from './invalidateKangurMobileAuthQueries';
import {
  type KangurMobileAuthMode,
} from './mobileAuthMode';
import { resolveKangurMobileDeveloperConfig } from '../config/mobileDeveloperConfig';
import { resolveKangurMobilePublicConfig } from '../config/mobilePublicConfig';
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

const toAuthErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Nie udalo sie odswiezyc sesji ucznia.';
  }

  const message = error.message.trim();
  if (!message) {
    return 'Nie udalo sie odswiezyc sesji ucznia.';
  }

  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage === 'failed to fetch' || normalizedMessage.includes('networkerror')) {
    return 'Nie udalo sie polaczyc z API Kangura.';
  }

  return message;
};

export function KangurMobileAuthProvider({
  children,
  adapter,
}: PropsWithChildren<{ adapter?: KangurAuthAdapter }>): React.JSX.Element {
  const { apiClient, storage } = useKangurMobileRuntime();
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
      setAuthError(toAuthErrorMessage(error));
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
      setAuthError(toAuthErrorMessage(error));
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
      setAuthError(toAuthErrorMessage(error));
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
