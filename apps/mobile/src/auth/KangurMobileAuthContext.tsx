import type {
  KangurAuthAdapter,
  KangurAuthSession,
  KangurAuthTransitionInput,
  KangurClientStorageAdapter,
} from '@kangur/platform';
import { createAnonymousKangurAuthSession } from '@kangur/platform';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  createLearnerSessionKangurAuthAdapter,
} from './createLearnerSessionKangurAuthAdapter';
import { createDevelopmentKangurAuthAdapter } from './createDevelopmentKangurAuthAdapter';
import { resolvePersistedKangurMobileLearnerSession } from './persistedKangurMobileLearnerSession';
import {
  type KangurMobileAuthMode,
} from './mobileAuthMode';
import { resolveKangurMobileDeveloperConfig } from '../config/mobileDeveloperConfig';
import { resolveKangurMobilePublicConfig } from '../config/mobilePublicConfig';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useKangurMobileAuthActions } from './useKangurMobileAuthActions';
import { hasPersistedLearnerSessionHint } from './authBootHelpers';
import { useAuthBootEffect, useDeveloperAutoSignIn } from './authEffectHooks';
import type { KangurMobileRuntime } from '../providers/KangurRuntimeContext.shared';

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

type AuthInitialState = {
  initialBootState: {
    persistedLearnerSession: KangurAuthSession | null;
    shouldBlockInitialSessionRefresh: boolean;
  };
  authAdapter: KangurAuthAdapter;
  initialSession: KangurAuthSession;
};

function useAuthInitialState(
  authMode: KangurMobileAuthMode,
  storage: KangurClientStorageAdapter,
  apiClient: KangurMobileRuntime['apiClient'],
  adapter?: KangurAuthAdapter,
): AuthInitialState {
  const [initialBootState] = useState(() => {
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

  const initialSession = useMemo(
    () =>
      initialBootState.persistedLearnerSession ??
      createAnonymousKangurAuthSession(
        authMode === 'learner-session'
          ? 'native-learner-session'
          : 'native-development',
      ),
    [authMode, initialBootState.persistedLearnerSession],
  );

  return { initialBootState, authAdapter, initialSession };
}

function useAuthContextValue({
  authError,
  authMode,
  developerAutoSignInEnabled,
  hasAttemptedDeveloperAutoSignIn,
  actions,
  supportsLearnerCredentials,
}: {
  authError: string | null;
  authMode: KangurMobileAuthMode;
  developerAutoSignInEnabled: boolean;
  hasAttemptedDeveloperAutoSignIn: boolean;
  actions: ReturnType<typeof useKangurMobileAuthActions>;
  supportsLearnerCredentials: boolean;
}): KangurMobileAuthContextValue {
  return useMemo<KangurMobileAuthContextValue>(
    () => ({
      authError,
      authMode,
      developerAutoSignInEnabled,
      hasAttemptedDeveloperAutoSignIn,
      session: actions.session,
      isLoadingAuth: actions.isLoadingAuth,
      refreshSession: actions.refreshSession,
      signIn: actions.signIn,
      signInWithLearnerCredentials: actions.signInWithLearnerCredentials,
      signOut: actions.signOut,
      supportsLearnerCredentials,
    }),
    [
      authError,
      authMode,
      developerAutoSignInEnabled,
      hasAttemptedDeveloperAutoSignIn,
      supportsLearnerCredentials,
      actions,
    ],
  );
}

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

  const { initialBootState, authAdapter, initialSession } = useAuthInitialState(
    authMode,
    storage,
    apiClient,
    adapter,
  );

  const [authError, setAuthError] = useState<string | null>(null);

  const actions = useKangurMobileAuthActions({
    authAdapter,
    initialSession,
    locale,
    queryClient,
    setAuthError,
  });

  useAuthBootEffect({
    shouldBlockInitialSessionRefresh:
      initialBootState.shouldBlockInitialSessionRefresh,
    setIsLoadingAuth: actions.setIsLoadingAuth,
    refreshSession: actions.refreshSession,
  });

  const { hasAttemptedDeveloperAutoSignIn } = useDeveloperAutoSignIn({
    developerAutoSignInEnabled:
      supportsLearnerCredentials &&
      developerConfig.autoSignIn &&
      developerConfig.learnerLoginName !== null &&
      developerConfig.learnerPassword !== null,
    isLoadingAuth: actions.isLoadingAuth,
    isAuthenticated: actions.session.status === 'authenticated',
    developerConfig,
    signInWithLearnerCredentials: actions.signInWithLearnerCredentials,
  });

  const value = useAuthContextValue({
    authError,
    authMode,
    developerAutoSignInEnabled:
      supportsLearnerCredentials &&
      developerConfig.autoSignIn &&
      developerConfig.learnerLoginName !== null &&
      developerConfig.learnerPassword !== null,
    hasAttemptedDeveloperAutoSignIn,
    actions,
    supportsLearnerCredentials,
  });

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
