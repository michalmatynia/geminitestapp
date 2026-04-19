'use client';

import { useRouter } from 'nextjs-toploader/app';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode, startTransition } from 'react';

import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { signalBootReady } from '@/features/kangur/ui/boot/boot-ready-signal';
import type { KangurUser } from '@kangur/platform';
import { getKangurLoginHref } from '@/features/kangur/config/routing';
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
import type {
  KangurAuthMode,
  KangurAuthContextValue,
  KangurAuthStateContextValue,
  KangurAuthActionsContextValue,
} from '@/shared/contracts/kangur-auth';
import {
  appendAuthModeParam,
  clearKangurAuthBootstrapCache,
  kangurShellSessionClient,
  primeKangurAuthBootstrapCache,
  resolveCanAccessParentAssignments,
} from '@/features/kangur/ui/context/kangur-auth-bootstrap-cache';

// Soft timeout for the initial auth check. If the platform auth call hasn't
// resolved within this window, the shell renders with the current (possibly
// unauthenticated) state and a background settlement completes later.
const AUTH_CHECK_TIMEOUT_MS = 1_500;
const CACHED_AUTH_REVALIDATION_DELAY_MS = 1_200;

type IdleCallbackHost = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const scheduleCachedAuthRevalidation = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const hostWindow = window as IdleCallbackHost;
  if (
    typeof hostWindow.requestIdleCallback === 'function' &&
    typeof hostWindow.cancelIdleCallback === 'function'
  ) {
    const idleId = hostWindow.requestIdleCallback(
      () => {
        callback();
      },
      { timeout: CACHED_AUTH_REVALIDATION_DELAY_MS }
    );

    return () => {
      hostWindow.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = window.setTimeout(callback, CACHED_AUTH_REVALIDATION_DELAY_MS);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

// Split into two contexts so components that only need auth state don't
// re-render when action callbacks are recreated, and vice versa.
const KangurAuthStateContext = createContext<KangurAuthStateContextValue | null>(null);
const KangurAuthActionsContext = createContext<KangurAuthActionsContextValue | null>(null);
type KangurAuthSessionContextValue = Pick<
  KangurAuthContextValue,
  'user' | 'isAuthenticated' | 'hasResolvedAuth' | 'canAccessParentAssignments'
>;
type KangurAuthStatusContextValue = Pick<
  KangurAuthContextValue,
  'isLoadingAuth' | 'isLoadingPublicSettings' | 'authError' | 'appPublicSettings'
> & {
  isLoggingOut: boolean;
};
const KangurAuthSessionContext = createContext<KangurAuthSessionContextValue | null>(null);
const KangurAuthStatusContext = createContext<KangurAuthStatusContextValue | null>(null);

export { clearKangurAuthBootstrapCache };

// KangurAuthProvider owns the learner auth lifecycle for the StudiQ web shell.
// It exposes two separate contexts (state + actions) to minimise re-renders.
//
// Boot strategy:
//  1. Read a synchronous bootstrap snapshot from the in-memory cache (primed
//     by the server component or a previous session).
//  2. If the cache contained a user, skip the blocking auth check and run a
//     silent background revalidation instead — this keeps first paint fast.
//  3. If no cache hit, run a timed auth check (AUTH_CHECK_TIMEOUT_MS). If the
//     check soft-times-out, render with the current state and settle later.
export const KangurAuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const router = useRouter();
  const routing = useOptionalKangurRouting();
  const { sanitizeManagedHref } = useKangurRouteAccess();
  // Resolve base path, public-alias canonicalisation, and fallback callback URL
  // from the current routing context (may be null when rendered outside the
  // Kangur route shell, e.g. in a CMS embed).
  const { basePath, canonicalizePublicAlias, fallbackCallbackUrl } = useMemo(
    () =>
      resolveKangurAuthProviderRouteConfig({
        routing,
        sanitizeManagedHref,
      }),
    [routing, sanitizeManagedHref]
  );
  // Read the synchronous bootstrap snapshot once on mount. This avoids a
  // loading flash when the cache was primed by the server component.
  const bootstrapSnapshot = useMemo(() => readKangurAuthBootstrapSnapshot(), []);
  // Monotonically increasing version counter used to discard stale auth
  // responses when a newer check has been initiated.
  const authRequestVersionRef = useRef(0);
  // Guards against concurrent logout calls (e.g. double-click).
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

  // checkAppState performs a versioned auth session check. It:
  //  - Increments the request version so stale responses are ignored.
  //  - Optionally reads from the bootstrap cache to avoid a network round-trip.
  //  - Applies a soft timeout: if the check takes longer than timeoutMs, the
  //    shell renders with the current state and a late-settlement callback
  //    updates state when the check eventually resolves.
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
      return scheduleCachedAuthRevalidation(() => {
        void kangurShellSessionClient.auth.me().then(
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
      });
    }

    void checkAppState({ timeoutMs: AUTH_CHECK_TIMEOUT_MS, useBootstrapCache: true })
      .finally(() => signalBootReady());
  }, [bootstrapSnapshot.cachedUser, checkAppState]);

  // logout clears local auth state immediately (optimistic), then calls the
  // platform logout endpoint. If shouldRedirect is true, the platform handles
  // the post-logout redirect (e.g. to the login page). Otherwise the shell
  // stays on the current route and re-checks auth state.
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
              await kangurShellSessionClient.auth.logout(window.location.href);
              return true;
            }
            await kangurShellSessionClient.auth.logout();
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

  // navigateToLogin builds the login URL with a callbackUrl so the learner is
  // returned to the current page after signing in. The callback URL is
  // sanitised to strip managed embed prefixes and canonicalise public aliases
  // before being appended as a query param.
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
      startTransition(() => { router.push(loginHref); });
    },
    [basePath, canonicalizePublicAlias, fallbackCallbackUrl, router, routing?.requestedPath, sanitizeManagedHref]
  );

  // selectLearner switches the active learner profile within a parent account.
  // It calls the platform learners.select endpoint, primes the bootstrap cache
  // with the returned user, and updates auth state synchronously.
  const selectLearner = useCallback(async (learnerId: string): Promise<void> => {
    const nextUser = await kangurShellSessionClient.learners.select(learnerId);
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
  const sessionValue = useMemo<KangurAuthSessionContextValue>(
    () => ({
      user,
      isAuthenticated,
      hasResolvedAuth,
      canAccessParentAssignments,
    }),
    [canAccessParentAssignments, hasResolvedAuth, isAuthenticated, user]
  );
  const statusValue = useMemo<KangurAuthStatusContextValue>(
    () => ({
      isLoadingAuth,
      isLoadingPublicSettings,
      isLoggingOut,
      authError,
      appPublicSettings,
    }),
    [appPublicSettings, authError, isLoadingAuth, isLoadingPublicSettings, isLoggingOut]
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
        <KangurAuthSessionContext.Provider value={sessionValue}>
          <KangurAuthStatusContext.Provider value={statusValue}>
            {children}
          </KangurAuthStatusContext.Provider>
        </KangurAuthSessionContext.Provider>
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

export const useKangurAuthSessionState = (): KangurAuthSessionContextValue => {
  const context = useContext(KangurAuthSessionContext);
  if (!context) {
    throw internalError('useKangurAuthSessionState must be used within a KangurAuthProvider');
  }
  return context;
};

export const useKangurAuthStatusState = (): KangurAuthStatusContextValue => {
  const context = useContext(KangurAuthStatusContext);
  if (!context) {
    throw internalError('useKangurAuthStatusState must be used within a KangurAuthProvider');
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

export const useOptionalKangurAuthActions = (): KangurAuthActionsContextValue | null => {
  return useContext(KangurAuthActionsContext);
};

export const useOptionalKangurAuthSessionState = (): KangurAuthSessionContextValue | null => {
  return useContext(KangurAuthSessionContext);
};

export const useOptionalKangurAuthStatusState = (): KangurAuthStatusContextValue | null => {
  return useContext(KangurAuthStatusContext);
};

export type { KangurAuthContextValue, KangurAuthError };
