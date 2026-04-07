'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { signalBootReady } from '@/features/kangur/ui/boot/boot-ready-signal';
import type { KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { getKangurLoginHref, KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import {
  type KangurAuthError,
  type KangurAuthCheckAppStateOptions,
  readKangurAuthBootstrapSnapshot,
  resolveKangurAuthProviderRouteConfig,
  resolveKangurAuthCheckTimeoutMs,
  createKangurAuthSessionRequest,
  awaitKangurTimedAuthCheck,
  scheduleKangurLateAuthCheckSettlement,
  applyKangurResolvedAuthState,
} from './KangurAuthContext.utils';
import {
  appendAuthModeParam,
  clearKangurAuthBootstrapCache,
  kangurPlatform,
  primeKangurAuthBootstrapCache,
  resolveCanAccessParentAssignments,
} from '@/features/kangur/ui/context/kangur-auth-bootstrap-cache';

const AUTH_CHECK_TIMEOUT_MS = 1_500;

type KangurAuthContextValue = {
  user: KangurUser | null;
  isAuthenticated: boolean;
  hasResolvedAuth: boolean;
  canAccessParentAssignments: boolean;
  isLoadingAuth: boolean;
  isLoggingOut?: boolean;
  isLoadingPublicSettings: boolean;
  authError: KangurAuthError | null;
  appPublicSettings: null;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: (options?: { authMode?: KangurAuthMode }) => void;
  checkAppState: (options?: KangurAuthCheckAppStateOptions) => Promise<KangurUser | null>;
  selectLearner: (learnerId: string) => Promise<void>;
};

type KangurAuthStateContextValue = Pick<
  KangurAuthContextValue,
  | 'user'
  | 'isAuthenticated'
  | 'hasResolvedAuth'
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

export { clearKangurAuthBootstrapCache };

export const KangurAuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const router = useRouter();
  const routing = useOptionalKangurRouting();
  const { sanitizeManagedHref } = useKangurRouteAccess();
  const { basePath, canonicalizePublicAlias, fallbackCallbackUrl } = useMemo(
    () =>
      resolveKangurAuthProviderRouteConfig({
        routing,
        sanitizeManagedHref,
      }),
    [routing, sanitizeManagedHref]
  );
  const bootstrapSnapshot = useMemo(() => readKangurAuthBootstrapSnapshot(), []);
  const authRequestVersionRef = useRef(0);
  const logoutInFlightRef = useRef(false);

  const [user, setUser] = useState<KangurUser | null>(bootstrapSnapshot.user);
  const [isAuthenticated, setIsAuthenticated] = useState(
    bootstrapSnapshot.isAuthenticated
  );
  const [hasResolvedAuth, setHasResolvedAuth] = useState(
    bootstrapSnapshot.hasResolvedAuth
  );
  const [isLoadingAuth, setIsLoadingAuth] = useState(
    bootstrapSnapshot.isLoadingAuth
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<KangurAuthError | null>(null);
  const [appPublicSettings] = useState<null>(null);
  const canAccessParentAssignments = resolveCanAccessParentAssignments(user, isAuthenticated);

  const checkAppState = useCallback(
    async (options?: KangurAuthCheckAppStateOptions): Promise<KangurUser | null> => {
      const timeoutMs = resolveKangurAuthCheckTimeoutMs(options);
      const useBootstrapCache = options?.useBootstrapCache ?? false;
      const requestVersion = ++authRequestVersionRef.current;
      setAuthError(null);
      setIsLoadingAuth(true);

      try {
        const authCheck = createKangurAuthSessionRequest({
          requestVersion,
          runtime: {
            authRequestVersionRef,
            setAuthError,
            setIsAuthenticated,
            setUser,
          },
          useBootstrapCache,
        });
        const { currentUser, didSoftTimeout } = await awaitKangurTimedAuthCheck({
          authCheck,
          timeoutMs,
        });

        if (didSoftTimeout) {
          if (authRequestVersionRef.current === requestVersion) {
            setIsLoadingAuth(false);
          }

          scheduleKangurLateAuthCheckSettlement({
            authCheck,
            requestVersion,
            runtime: {
              authRequestVersionRef,
              setAuthError,
              setHasResolvedAuth,
              setIsAuthenticated,
              setUser,
            },
          });
          return null;
        }

        if (authRequestVersionRef.current !== requestVersion) {
          return null;
        }

        applyKangurResolvedAuthState({
          currentUser,
          runtime: {
            setAuthError,
            setHasResolvedAuth,
            setIsAuthenticated,
            setUser,
          },
        });
        return currentUser;
      } finally {
        if (authRequestVersionRef.current === requestVersion) {
          setIsLoadingAuth(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    // When the bootstrap cache was consumed synchronously in useState
    // initialisers above, skip the blocking auth check and run a silent
    // background revalidation instead.  This avoids the extra render cycle
    // and the 1.5 s timeout race on first load.
    const cachedUser = bootstrapSnapshot.cachedUser;
    if (typeof cachedUser !== 'undefined') {
      signalBootReady();

      if (cachedUser === null) {
        return;
      }

      // Background revalidation — update state only if the result differs.
      void kangurPlatform.auth.me().then(
        (freshUser) => {
          primeKangurAuthBootstrapCache(freshUser);
          setUser((prev) => {
            if (prev?.id === freshUser?.id) return prev;
            return freshUser;
          });
          setIsAuthenticated(freshUser !== null);
          setHasResolvedAuth(true);
        },
        () => {
          // Revalidation failed — keep the cached state; don't disrupt the UI.
        }
      );
      return;
    }

    void checkAppState({ timeoutMs: AUTH_CHECK_TIMEOUT_MS, useBootstrapCache: true })
      .finally(() => signalBootReady());
  }, [bootstrapSnapshot.cachedUser, checkAppState]);

  const logout = useCallback((shouldRedirect = true): void => {
    if (logoutInFlightRef.current) {
      return;
    }

    logoutInFlightRef.current = true;
    primeKangurAuthBootstrapCache(null);
    authRequestVersionRef.current += 1;
    setUser(null);
    setIsAuthenticated(false);
    setHasResolvedAuth(true);
    setAuthError(null);
    setIsLoggingOut(true);
    setIsLoadingAuth(!shouldRedirect);

    void (async (): Promise<void> => {
      try {
        await withKangurClientError(
          {
            source: 'kangur.auth',
            action: 'logout',
            description: 'Logs out the current Kangur session.',
            context: { shouldRedirect },
          },
          async () => {
            if (shouldRedirect) {
              await kangurPlatform.auth.logout(window.location.href);
              return true;
            }
            await kangurPlatform.auth.logout();
            router.refresh();
            await checkAppState();
            return true;
          },
          {
            fallback: false,
            onError: () => {
              if (!shouldRedirect) {
                void checkAppState();
              }
            },
          }
        );
      } finally {
        logoutInFlightRef.current = false;
        setIsLoggingOut(false);
      }
    })();
  }, [checkAppState, router]);

  const navigateToLogin = useCallback(
    (options?: { authMode?: KangurAuthMode }): void => {
      const callbackUrl =
        typeof window === 'undefined' ? fallbackCallbackUrl : window.location.href;
      const resolvedCallbackUrl =
        sanitizeManagedHref({
          href: callbackUrl,
          pathname:
            typeof window === 'undefined'
              ? routing?.requestedPath ?? null
              : window.location.pathname,
          currentOrigin: typeof window === 'undefined' ? null : window.location.origin,
          canonicalizePublicAlias,
          basePath,
          fallbackHref: fallbackCallbackUrl,
        }) ?? fallbackCallbackUrl;
      const loginHref = appendAuthModeParam(
        getKangurLoginHref(basePath, resolvedCallbackUrl),
        options?.authMode
      );
      router.push(loginHref);
    },
    [basePath, canonicalizePublicAlias, fallbackCallbackUrl, router, routing?.requestedPath, sanitizeManagedHref]
  );

  const selectLearner = useCallback(async (learnerId: string): Promise<void> => {
    const nextUser = await kangurPlatform.learners.select(learnerId);
    primeKangurAuthBootstrapCache(nextUser);
    setUser(nextUser);
    setIsAuthenticated(true);
    setHasResolvedAuth(true);
    setAuthError(null);
  }, []);

  const stateValue = useMemo<KangurAuthStateContextValue>(
    () => ({
      user,
      isAuthenticated,
      hasResolvedAuth,
      canAccessParentAssignments,
      isLoadingAuth,
      isLoggingOut,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
    }),
    [
      appPublicSettings,
      authError,
      canAccessParentAssignments,
      hasResolvedAuth,
      isAuthenticated,
      isLoadingAuth,
      isLoggingOut,
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
