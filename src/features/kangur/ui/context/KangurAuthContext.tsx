'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { internalError } from '@/shared/errors/app-error';

type KangurAuthError = {
  type: 'unknown' | 'auth_required' | 'user_not_registered';
  message: string;
};

type KangurAuthContextValue = {
  user: KangurUser | null;
  isAuthenticated: boolean;
  canAccessParentAssignments: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: KangurAuthError | null;
  appPublicSettings: null;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkAppState: () => Promise<void>;
  selectLearner: (learnerId: string) => Promise<void>;
};

type KangurAuthStateContextValue = Pick<
  KangurAuthContextValue,
  | 'user'
  | 'isAuthenticated'
  | 'canAccessParentAssignments'
  | 'isLoadingAuth'
  | 'isLoadingPublicSettings'
  | 'authError'
  | 'appPublicSettings'
>;

type KangurAuthActionsContextValue = Pick<
  KangurAuthContextValue,
  'logout' | 'navigateToLogin' | 'checkAppState' | 'selectLearner'
>;

const KangurAuthStateContext = createContext<KangurAuthStateContextValue | null>(null);
const KangurAuthActionsContext = createContext<KangurAuthActionsContextValue | null>(null);
const kangurPlatform = getKangurPlatform();

const resolveCanAccessParentAssignments = (
  user: KangurUser | null,
  isAuthenticated: boolean
): boolean => isAuthenticated && Boolean(user?.activeLearner?.id);

const resolveErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }
  return 'Authentication check failed';
};

export const KangurAuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const router = useRouter();
  const [user, setUser] = useState<KangurUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<KangurAuthError | null>(null);
  const [appPublicSettings] = useState<null>(null);
  const canAccessParentAssignments = resolveCanAccessParentAssignments(user, isAuthenticated);

  const checkAppState = useCallback(async (): Promise<void> => {
    setAuthError(null);
    setIsLoadingAuth(true);

    try {
      const currentUser = await kangurPlatform.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error: unknown) {
      setUser(null);
      setIsAuthenticated(false);

      if (isKangurAuthStatusError(error)) {
        // Anonymous mode is allowed; authentication is optional.
        setAuthError(null);
      } else {
        logKangurClientError(error, {
          source: 'KangurAuthContext',
          action: 'checkAppState',
          stage: 'auth.me',
        });
        setAuthError({
          type: 'unknown',
          message: resolveErrorMessage(error),
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    void checkAppState();
  }, [checkAppState]);

  const logout = useCallback((shouldRedirect = true): void => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      void kangurPlatform.auth.logout(window.location.href).catch((error: unknown) => {
        logKangurClientError(error, {
          source: 'KangurAuthContext',
          action: 'logout',
          shouldRedirect: true,
        });
      });
      return;
    }
    void kangurPlatform.auth.logout().catch((error: unknown) => {
      logKangurClientError(error, {
        source: 'KangurAuthContext',
        action: 'logout',
        shouldRedirect: false,
      });
    });
  }, []);

  const navigateToLogin = useCallback((): void => {
    const loginHref = kangurPlatform.auth.prepareLoginHref(window.location.href);
    router.push(loginHref);
  }, [router]);

  const selectLearner = useCallback(async (learnerId: string): Promise<void> => {
    const nextUser = await kangurPlatform.learners.select(learnerId);
    setUser(nextUser);
    setIsAuthenticated(true);
    setAuthError(null);
  }, []);

  const stateValue = useMemo<KangurAuthStateContextValue>(
    () => ({
      user,
      isAuthenticated,
      canAccessParentAssignments,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
    }),
    [
      appPublicSettings,
      authError,
      canAccessParentAssignments,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      user,
    ]
  );
  const actionsValue = useMemo<KangurAuthActionsContextValue>(
    () => ({
      logout,
      navigateToLogin,
      checkAppState,
      selectLearner,
    }),
    [checkAppState, logout, navigateToLogin, selectLearner]
  );

  return (
    <KangurAuthActionsContext.Provider value={actionsValue}>
      <KangurAuthStateContext.Provider value={stateValue}>
        {children}
      </KangurAuthStateContext.Provider>
    </KangurAuthActionsContext.Provider>
  );
};

export const useKangurAuthState = (): KangurAuthStateContextValue => {
  const context = useContext(KangurAuthStateContext);
  if (!context) {
    throw internalError('useKangurAuthState must be used within a KangurAuthProvider');
  }
  return context;
};

export const useKangurAuthActions = (): KangurAuthActionsContextValue => {
  const context = useContext(KangurAuthActionsContext);
  if (!context) {
    throw internalError('useKangurAuthActions must be used within a KangurAuthProvider');
  }
  return context;
};

export const useKangurAuth = (): KangurAuthContextValue => {
  const state = useContext(KangurAuthStateContext);
  const actions = useContext(KangurAuthActionsContext);
  if (!state || !actions) {
    throw internalError('useKangurAuth must be used within a KangurAuthProvider');
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
};

export const useOptionalKangurAuth = (): KangurAuthContextValue | null => {
  const state = useContext(KangurAuthStateContext);
  const actions = useContext(KangurAuthActionsContext);
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
};

export type { KangurAuthContextValue, KangurAuthError };
