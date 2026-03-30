import type { KangurUser } from '@kangur/platform';

import { withKangurClientError } from '@/features/kangur/observability/client';
import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';

import {
  kangurPlatform,
  loadKangurAuthBootstrapSession,
  primeKangurAuthBootstrapCache,
  readKangurAuthBootstrapCache,
  resolveErrorMessage,
} from './kangur-auth-bootstrap-cache';

export type KangurAuthCheckAppStateOptions = {
  timeoutMs?: number | null;
  useBootstrapCache?: boolean;
};

export type KangurAuthError = {
  type: 'unknown' | 'auth_required' | 'user_not_registered';
  message: string;
};

export type KangurAuthContextValue = {
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

export type KangurAuthStateContextValue = Pick<
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

export type KangurAuthActionsContextValue = Pick<
  KangurAuthContextValue,
  'logout' | 'navigateToLogin' | 'checkAppState' | 'selectLearner'
>;

type KangurAuthBootstrapSnapshot = {
  cachedUser: KangurUser | null | undefined;
  hasResolvedAuth: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  user: KangurUser | null;
};

export type KangurAuthRuntimeSetters = {
  authRequestVersionRef: { current: number };
  setAuthError: (value: KangurAuthError | null) => void;
  setHasResolvedAuth: (value: boolean) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoadingAuth: (value: boolean) => void;
  setUser: (value: KangurUser | null) => void;
};

type KangurAuthRoutingSnapshot = {
  basePath?: string | null;
  requestedPath?: string | null;
} | null | undefined;

type KangurManagedHrefSanitizer = (args: {
  href: string;
  pathname: string | null;
  currentOrigin: string | null;
  canonicalizePublicAlias: boolean;
  basePath: string;
  fallbackHref: string;
}) => string | null | undefined;

export const readKangurAuthBootstrapSnapshot = (): KangurAuthBootstrapSnapshot => {
  const cachedUser = readKangurAuthBootstrapCache();
  const hasResolvedAuth = typeof cachedUser !== 'undefined';

  return {
    cachedUser,
    hasResolvedAuth,
    isAuthenticated: hasResolvedAuth ? cachedUser !== null : false,
    isLoadingAuth: !hasResolvedAuth,
    user: hasResolvedAuth ? cachedUser ?? null : null,
  };
};

const resolveKangurAuthCurrentOrigin = (): string | null =>
  typeof window === 'undefined' ? null : window.location.origin;

const resolveKangurAuthRequestedPath = ({
  basePath,
  routing,
}: {
  basePath: string;
  routing: KangurAuthRoutingSnapshot;
}): { href: string; pathname: string | null } => ({
  href: routing?.requestedPath ?? basePath,
  pathname: routing?.requestedPath ?? null,
});

export const resolveKangurAuthProviderRouteConfig = ({
  routing,
  sanitizeManagedHref,
}: {
  routing: KangurAuthRoutingSnapshot;
  sanitizeManagedHref: KangurManagedHrefSanitizer;
}): {
  basePath: string;
  canonicalizePublicAlias: boolean;
  fallbackCallbackUrl: string;
} => {
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const canonicalizePublicAlias = basePath === '/';
  const requestedPath = resolveKangurAuthRequestedPath({ basePath, routing });

  return {
    basePath,
    canonicalizePublicAlias,
    fallbackCallbackUrl:
      sanitizeManagedHref({
        href: requestedPath.href,
        pathname: requestedPath.pathname,
        currentOrigin: resolveKangurAuthCurrentOrigin(),
        canonicalizePublicAlias,
        basePath,
        fallbackHref: basePath,
      }) ?? basePath,
  };
};

export const resolveKangurAuthCheckTimeoutMs = (
  options?: KangurAuthCheckAppStateOptions
): number | null =>
  typeof options?.timeoutMs === 'number' && Number.isFinite(options.timeoutMs)
    ? Math.max(0, options.timeoutMs)
    : null;

const handleKangurAuthCheckError = ({
  error,
  requestVersion,
  runtime,
}: {
  error: unknown;
  requestVersion: number;
  runtime: Pick<
    KangurAuthRuntimeSetters,
    'authRequestVersionRef' | 'setAuthError' | 'setIsAuthenticated' | 'setUser'
  >;
}): void => {
  if (runtime.authRequestVersionRef.current !== requestVersion) {
    return;
  }

  runtime.setUser(null);
  runtime.setIsAuthenticated(false);

  if (isKangurAuthStatusError(error)) {
    primeKangurAuthBootstrapCache(null);
    runtime.setAuthError(null);
    return;
  }

  runtime.setAuthError({
    type: 'unknown',
    message: resolveErrorMessage(error),
  });
};

export const createKangurAuthSessionRequest = ({
  requestVersion,
  runtime,
  useBootstrapCache,
}: {
  requestVersion: number;
  runtime: Pick<
    KangurAuthRuntimeSetters,
    'authRequestVersionRef' | 'setAuthError' | 'setIsAuthenticated' | 'setUser'
  >;
  useBootstrapCache: boolean;
}): Promise<KangurUser | null> =>
  withKangurClientError(
    {
      source: 'kangur.auth',
      action: 'check-app-state',
      description: 'Fetches the current Kangur auth session.',
      context: { stage: useBootstrapCache ? 'auth.me.bootstrap' : 'auth.me' },
    },
    async () =>
      useBootstrapCache
        ? await loadKangurAuthBootstrapSession()
        : await kangurPlatform.auth.me(),
    {
      fallback: null,
      shouldReport: (error) => !isKangurAuthStatusError(error),
      onError: (error) =>
        handleKangurAuthCheckError({
          error,
          requestVersion,
          runtime,
        }),
    }
  );

export const awaitKangurTimedAuthCheck = async ({
  authCheck,
  timeoutMs,
}: {
  authCheck: Promise<KangurUser | null>;
  timeoutMs: number | null;
}): Promise<{ currentUser: KangurUser | null; didSoftTimeout: boolean }> => {
  if (timeoutMs === null) {
    return {
      currentUser: await authCheck,
      didSoftTimeout: false,
    };
  }

  let didSoftTimeout = false;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const currentUser = await Promise.race([
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

  return { currentUser, didSoftTimeout };
};

export const scheduleKangurLateAuthCheckSettlement = ({
  authCheck,
  requestVersion,
  runtime,
}: {
  authCheck: Promise<KangurUser | null>;
  requestVersion: number;
  runtime: Pick<
    KangurAuthRuntimeSetters,
    | 'authRequestVersionRef'
    | 'setAuthError'
    | 'setHasResolvedAuth'
    | 'setIsAuthenticated'
    | 'setUser'
  >;
}): void => {
  void authCheck.then((lateUser) => {
    if (runtime.authRequestVersionRef.current !== requestVersion) {
      return;
    }

    if (lateUser) {
      runtime.setUser(lateUser);
      runtime.setIsAuthenticated(true);
      runtime.setAuthError(null);
    }

    runtime.setHasResolvedAuth(true);
  });
};

export const applyKangurResolvedAuthState = ({
  currentUser,
  runtime,
}: {
  currentUser: KangurUser | null;
  runtime: Pick<
    KangurAuthRuntimeSetters,
    'setAuthError' | 'setHasResolvedAuth' | 'setIsAuthenticated' | 'setUser'
  >;
}): void => {
  if (currentUser) {
    primeKangurAuthBootstrapCache(currentUser);
    runtime.setUser(currentUser);
    runtime.setIsAuthenticated(true);
    runtime.setAuthError(null);
  } else {
    primeKangurAuthBootstrapCache(null);
  }

  runtime.setHasResolvedAuth(true);
};
