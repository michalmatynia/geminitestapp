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
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { getKangurLoginHref, KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { isKangurSocialBatchCaptureHref } from '@/features/kangur/shared/capture-mode';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import { internalError } from '@/features/kangur/shared/errors/app-error';

const AUTH_CHECK_TIMEOUT_MS = 1_500;

type KangurAuthCheckAppStateOptions = {
  timeoutMs?: number | null;
};

type KangurAuthError = {
  type: 'unknown' | 'auth_required' | 'user_not_registered';
  message: string;
};

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
const kangurPlatform = getKangurPlatform();

const resolveCanAccessParentAssignments = (
  user: KangurUser | null,
  isAuthenticated: boolean
): boolean =>
  isAuthenticated &&
  user?.actorType === 'learner' &&
  Boolean(user?.activeLearner?.id);

const resolveErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }
  return 'Authentication check failed';
};

const appendAuthModeParam = (href: string, authMode?: KangurAuthMode): string => {
  if (!authMode) {
    return href;
  }
  return withKangurClientErrorSync(
    {
      source: 'kangur.auth',
      action: 'append-auth-mode',
      description: 'Adds auth mode to the Kangur login href.',
      context: { authMode },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      parsed.searchParams.set('authMode', authMode);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    },
    {
      fallback: `${href}${href.includes('?') ? '&' : '?'}authMode=${encodeURIComponent(authMode)}`,
    }
  );
};

export const KangurAuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const router = useRouter();
  const routing = useOptionalKangurRouting();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const fallbackCallbackUrl = routing?.requestedPath ?? basePath;
  const requestedHref =
    routing?.requestedHref ??
    (typeof window !== 'undefined' ? window.location.href : fallbackCallbackUrl);
  const skipAuthBootstrap = isKangurSocialBatchCaptureHref(requestedHref);
  const authRequestVersionRef = useRef(0);
  const logoutInFlightRef = useRef(false);
  const [user, setUser] = useState<KangurUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<KangurAuthError | null>(null);
  const [appPublicSettings] = useState<null>(null);
  const canAccessParentAssignments = resolveCanAccessParentAssignments(user, isAuthenticated);

  const checkAppState = useCallback(
    async (options?: KangurAuthCheckAppStateOptions): Promise<KangurUser | null> => {
      const timeoutMs =
        typeof options?.timeoutMs === 'number' && Number.isFinite(options.timeoutMs)
          ? Math.max(0, options.timeoutMs)
          : null;
      const requestVersion = ++authRequestVersionRef.current;
      let didSoftTimeout = false;
      let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
      setAuthError(null);
      setIsLoadingAuth(true);
      try {
        const authCheck = withKangurClientError(
          {
            source: 'kangur.auth',
            action: 'check-app-state',
            description: 'Fetches the current Kangur auth session.',
            context: { stage: 'auth.me' },
          },
          async () => await kangurPlatform.auth.me(),
          {
            fallback: null,
            shouldReport: (error) => !isKangurAuthStatusError(error),
            onError: (error) => {
              if (authRequestVersionRef.current !== requestVersion) {
                return;
              }
              setUser(null);
              setIsAuthenticated(false);

              if (isKangurAuthStatusError(error)) {
                // Anonymous mode is allowed; authentication is optional.
                setAuthError(null);
              } else {
                setAuthError({
                  type: 'unknown',
                  message: resolveErrorMessage(error),
                });
              }
            },
          }
        );
        const currentUser =
          timeoutMs === null
            ? await authCheck
            : await Promise.race([
                authCheck,
                new Promise<null>((resolve) => {
                  timeoutId = globalThis.setTimeout(() => {
                    didSoftTimeout = true;
                    resolve(null);
                  }, timeoutMs);
                }),
              ]);
        if (timeoutId !== null) {
          globalThis.clearTimeout(timeoutId);
        }

        if (didSoftTimeout) {
          if (authRequestVersionRef.current === requestVersion) {
            setIsLoadingAuth(false);
          }

          // Let the original request finish in the background so slow auth checks
          // can still settle the session instead of downgrading to anonymous mode.
          void authCheck.then((lateUser) => {
            if (authRequestVersionRef.current !== requestVersion) {
              return;
            }
            if (lateUser) {
              setUser(lateUser);
              setIsAuthenticated(true);
              setAuthError(null);
            }
            setHasResolvedAuth(true);
          });

          return null;
        }
        if (authRequestVersionRef.current !== requestVersion) {
          return null;
        }
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setAuthError(null);
        }
        setHasResolvedAuth(true);
        return currentUser;
      } finally {
        if (!didSoftTimeout && authRequestVersionRef.current === requestVersion) {
          setIsLoadingAuth(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (skipAuthBootstrap) {
      authRequestVersionRef.current += 1;
      setUser(null);
      setIsAuthenticated(false);
      setHasResolvedAuth(true);
      setAuthError(null);
      setIsLoadingAuth(false);
      return;
    }

    void checkAppState({ timeoutMs: AUTH_CHECK_TIMEOUT_MS });
  }, [checkAppState, skipAuthBootstrap]);

  const logout = useCallback((shouldRedirect = true): void => {
    if (logoutInFlightRef.current) {
      return;
    }

    logoutInFlightRef.current = true;
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
      const loginHref = appendAuthModeParam(
        getKangurLoginHref(basePath, callbackUrl),
        options?.authMode
      );
      router.push(loginHref);
    },
    [basePath, fallbackCallbackUrl, router]
  );

  const selectLearner = useCallback(async (learnerId: string): Promise<void> => {
    const nextUser = await kangurPlatform.learners.select(learnerId);
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
