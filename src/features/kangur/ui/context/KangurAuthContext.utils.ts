import type { KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import {
  primeKangurAuthBootstrapCache,
  readKangurAuthBootstrapCache,
  resolveErrorMessage,
  loadKangurAuthBootstrapSession,
  kangurPlatform,
} from '@/features/kangur/ui/context/kangur-auth-bootstrap-cache';
import type { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import type { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import type {
  KangurAuthError,
  KangurAuthBootstrapSnapshot,
  KangurAuthRuntimeSetters,
  KangurAuthContextValue,
} from '@/shared/contracts/kangur-auth';

type KangurAuthCheckAppStateOptions = {
  timeoutMs?: number | null;
  useBootstrapCache?: boolean;
};

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

export const resolveKangurAuthCurrentOrigin = (): string | null =>
  typeof window === 'undefined' ? null : window.location.origin;

export const resolveKangurAuthRequestedPath = ({
  basePath,
  routing,
}: {
  basePath: string;
  routing: ReturnType<typeof useOptionalKangurRouting>;
}): { href: string; pathname: string | null } => ({
  href: routing?.requestedPath ?? basePath,
  pathname: routing?.requestedPath ?? null,
});

export const resolveKangurAuthProviderRouteConfig = ({
  routing,
  sanitizeManagedHref,
}: {
  routing: ReturnType<typeof useOptionalKangurRouting>;
  sanitizeManagedHref: ReturnType<typeof useKangurRouteAccess>['sanitizeManagedHref'];
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

export const handleKangurAuthCheckError = ({
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

import { withKangurClientError } from '@/features/kangur/observability/client';

export const resolveKangurAuthCheckTimeoutMs = (
  options?: KangurAuthCheckAppStateOptions
): number | null =>
  typeof options?.timeoutMs === 'number' && Number.isFinite(options.timeoutMs)
    ? Math.max(0, options.timeoutMs)
    : null;

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
