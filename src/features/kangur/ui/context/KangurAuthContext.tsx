'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@/features/kangur/services/ports';
import { logKangurClientError } from '@/features/kangur/observability/client';

type KangurAuthError = {
  type: 'unknown' | 'auth_required' | 'user_not_registered';
  message: string;
};

type KangurAuthContextValue = {
  user: KangurUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: KangurAuthError | null;
  appPublicSettings: null;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkAppState: () => Promise<void>;
};

const KangurAuthContext = createContext<KangurAuthContextValue | null>(null);
const kangurPlatform = getKangurPlatform();

const isStatusError = (value: unknown): value is { status: number } =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof (value as { status?: unknown }).status === 'number';

const resolveErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }
  return 'Authentication check failed';
};

export const KangurAuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const [user, setUser] = useState<KangurUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<KangurAuthError | null>(null);
  const [appPublicSettings] = useState<null>(null);

  const checkAppState = async (): Promise<void> => {
    setAuthError(null);
    setIsLoadingAuth(true);

    try {
      const currentUser = await kangurPlatform.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error: unknown) {
      setUser(null);
      setIsAuthenticated(false);

      if (isStatusError(error) && (error.status === 401 || error.status === 403)) {
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
  };

  useEffect(() => {
    void checkAppState();
  }, []);

  const logout = (shouldRedirect = true): void => {
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
  };

  const navigateToLogin = (): void => {
    kangurPlatform.auth.redirectToLogin(window.location.href);
  };

  const value = useMemo<KangurAuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }),
    [user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings]
  );

  return <KangurAuthContext.Provider value={value}>{children}</KangurAuthContext.Provider>;
};

export const useKangurAuth = (): KangurAuthContextValue => {
  const context = useContext(KangurAuthContext);
  if (!context) {
    throw new Error('useKangurAuth must be used within a KangurAuthProvider');
  }
  return context;
};

export type { KangurAuthContextValue, KangurAuthError };
