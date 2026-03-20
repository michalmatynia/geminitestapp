import {
  getKangurLoginHref,
  resolveKangurPublicBasePathFromHref,
} from '@/features/kangur/config/routing';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import type { KangurUser } from '@/features/kangur/services/ports';
import { kangurAuthUserSchema } from '@kangur/contracts';

import { KANGUR_AUTH_ME_ENDPOINT } from './local-kangur-platform-endpoints';
import { clearScoreQueryCache } from './local-kangur-platform-score-cache';
import { createActorAwareHeaders } from './local-kangur-platform-shared';

const AUTH_CACHE_TTL_MS = 30_000;
const ANONYMOUS_AUTH_CACHE_TTL_MS = 8_000;

type SessionUserCacheEntry = {
  user: KangurUser | null;
  isAnonymous: boolean;
  expiresAt: number;
};

let sessionUserCache: SessionUserCacheEntry | null = null;
let sessionUserInFlight: Promise<KangurUser> | null = null;
let sessionUserCacheEpoch = 0;

const unauthorizedError = (): Error & { status: number } => {
  const error = new Error('Authentication required') as Error & { status: number };
  error.status = 401;
  return error;
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
};

export const resolveSessionUser = async (): Promise<KangurUser> => {
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
    const response = await fetch(KANGUR_AUTH_ME_ENDPOINT, {
      cache: 'no-store',
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const error = unauthorizedError();
      error.status = response.status;
      if (response.status === 401 || response.status === 403) {
        if (sessionUserCacheEpoch === requestEpoch) {
          cacheResolvedUser(null, true);
        }
      }
      throw error;
    }

    const payload = (await response.json()) as unknown;
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
