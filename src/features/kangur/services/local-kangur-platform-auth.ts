import { createKangurApiClient } from '@kangur/api-client';
import type { KangurUser } from '@kangur/platform';
import {
  getKangurLoginHref,
  resolveKangurPublicBasePathFromHref,
} from '@/features/kangur/config/routing';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { saveProgressOwnerKey } from '@/features/kangur/ui/services/progress';
import { kangurAuthUserSchema } from '@kangur/contracts';

import { clearScoreQueryCache } from './local-kangur-platform-score-cache';
import { createActorAwareHeaders } from './local-kangur-platform-shared';

const AUTH_CACHE_TTL_MS = 30_000;
const ANONYMOUS_AUTH_CACHE_TTL_MS = 8_000;

type SessionUserCacheEntry = {
  user: KangurUser | null;
  isAnonymous: boolean;
  expiresAt: number;
};

type KangurBootstrapWindow = Window & {
  __KANGUR_AUTH_BOOTSTRAP__?: KangurUser | null;
};

let sessionUserCache: SessionUserCacheEntry | null = null;
let sessionUserInFlight: Promise<KangurUser> | null = null;
let sessionUserCacheEpoch = 0;
let sessionUserBootstrapHydrated = false;

const kangurAuthApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

const unauthorizedError = (): Error & { status: number } => {
  const error = new Error('Authentication required') as Error & { status: number };
  error.status = 401;
  return error;
};

const clearStoredProgressOwnerKey = (): void => {
  saveProgressOwnerKey(null);
};

export const clearSessionUserCache = (): void => {
  sessionUserCacheEpoch += 1;
  sessionUserCache = null;
  sessionUserInFlight = null;
};

export const prepareLoginHref = (returnUrl: string): string => {
  clearSessionUserCache();
  clearScoreQueryCache();
  const basePath = resolveKangurPublicBasePathFromHref(returnUrl, window.location.origin);
  return getKangurLoginHref(basePath, returnUrl);
};

const cacheResolvedUser = (user: KangurUser | null, anonymous = false): void => {
  if (!user || anonymous) {
    clearStoredActiveLearnerId();
    clearStoredProgressOwnerKey();
  }

  sessionUserCache = {
    user,
    isAnonymous: anonymous,
    expiresAt: Date.now() + (anonymous ? ANONYMOUS_AUTH_CACHE_TTL_MS : AUTH_CACHE_TTL_MS),
  };
};

const syncActiveLearnerStorage = (user: KangurUser): void => {
  const activeLearnerId = user.activeLearner?.id ?? null;
  if (activeLearnerId) {
    setStoredActiveLearnerId(activeLearnerId);
    return;
  }
  clearStoredActiveLearnerId();
  clearStoredProgressOwnerKey();
};

function hydrateSessionUserCacheFromBootstrap(): void {
  if (sessionUserBootstrapHydrated || typeof window === 'undefined') {
    return;
  }

  sessionUserBootstrapHydrated = true;
  const bootstrapWindow = window as KangurBootstrapWindow;
  const bootstrapUser = bootstrapWindow.__KANGUR_AUTH_BOOTSTRAP__;

  if (typeof bootstrapUser === 'undefined') {
    return;
  }

  if (bootstrapUser) {
    syncActiveLearnerStorage(bootstrapUser);
  }

  cacheResolvedUser(bootstrapUser, bootstrapUser === null);
}

hydrateSessionUserCacheFromBootstrap();

export const resolveSessionUser = async (): Promise<KangurUser> => {
  hydrateSessionUserCacheFromBootstrap();
  const now = Date.now();
  if (sessionUserCache && sessionUserCache.expiresAt > now) {
    if (sessionUserCache.isAnonymous) {
      throw unauthorizedError();
    }
    if (sessionUserCache.user) {
      return sessionUserCache.user;
    }
  }

  if (sessionUserInFlight) {
    return sessionUserInFlight;
  }

  const requestEpoch = sessionUserCacheEpoch;
  const fetchPromise = (async (): Promise<KangurUser> => {
    try {
      const payload = await kangurAuthApiClient.getAuthMe({
        cache: 'no-store',
      });
      const parsed = kangurAuthUserSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur auth payload validation failed.');
      }

      const mappedUser = parsed.data;
      syncActiveLearnerStorage(mappedUser);
      if (sessionUserCacheEpoch === requestEpoch) {
        cacheResolvedUser(mappedUser, false);
      }
      return mappedUser;
    } catch (error) {
      const status = typeof error === 'object' && error && 'status' in error ? error.status : undefined;
      if (typeof status === 'number' && (status === 401 || status === 403)) {
        const authError = unauthorizedError();
        authError.status = status;
        if (sessionUserCacheEpoch === requestEpoch) {
          cacheResolvedUser(null, true);
        }
        throw authError;
      }
      throw error;
    }
  })();

  sessionUserInFlight = fetchPromise;

  try {
    return await fetchPromise;
  } finally {
    if (sessionUserInFlight === fetchPromise) {
      sessionUserInFlight = null;
    }
  }
};

export const requestKangurLogout = async (
  requestOptions?: RequestInit
): Promise<{ ok: boolean }> =>
  createKangurApiClient({
    fetchImpl: fetch,
    credentials: 'same-origin',
  }).logout({
    ...requestOptions,
  });
