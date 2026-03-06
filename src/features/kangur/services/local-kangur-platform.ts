'use client';

import { getSession, signIn, signOut } from 'next-auth/react';
import { z } from 'zod';

import { kangurProgressStateSchema, kangurScoreSchema } from '@/shared/contracts/kangur';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type {
  KangurPlatform,
  KangurProgressRecord,
  KangurScoreCreateInput,
  KangurScoreRecord,
  KangurUser,
} from '@/features/kangur/services/ports';
import { logKangurClientError } from '@/features/kangur/observability/client';

const KANGUR_PROGRESS_ENDPOINT = '/api/kangur/progress';
const KANGUR_SCORES_ENDPOINT = '/api/kangur/scores';
const DEFAULT_SCORE_LIMIT = 100;
const AUTH_CACHE_TTL_MS = 30_000;
const ANONYMOUS_AUTH_CACHE_TTL_MS = 8_000;
const SCORE_CACHE_TTL_MS = 12_000;
const progressResponseSchema = kangurProgressStateSchema;
const scoreListSchema = z.array(kangurScoreSchema);

type SessionUserCacheEntry = {
  user: KangurUser | null;
  isAnonymous: boolean;
  expiresAt: number;
};

type ScoreCacheEntry = {
  rows: KangurScoreRecord[];
  expiresAt: number;
};

let sessionUserCache: SessionUserCacheEntry | null = null;
let sessionUserInFlight: Promise<KangurUser> | null = null;
const scoreQueryCache = new Map<string, ScoreCacheEntry>();
const scoreQueryInFlight = new Map<string, Promise<KangurScoreRecord[]>>();

const unauthorizedError = (): Error & { status: number } => {
  const error = new Error('Authentication required') as Error & { status: number };
  error.status = 401;
  return error;
};

const isStatusError = (value: unknown): value is { status: number } =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof (value as { status?: unknown }).status === 'number';

const clearScoreQueryCache = (): void => {
  scoreQueryCache.clear();
  scoreQueryInFlight.clear();
};

const clearSessionUserCache = (): void => {
  sessionUserCache = null;
  sessionUserInFlight = null;
};

const resolveSessionUser = async (): Promise<KangurUser> => {
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

  const fetchPromise = (async (): Promise<KangurUser> => {
    const session = await getSession();
    const sessionUser = session?.user;
    if (!sessionUser) {
      const error = unauthorizedError();
      sessionUserCache = {
        user: null,
        isAnonymous: true,
        expiresAt: Date.now() + ANONYMOUS_AUTH_CACHE_TTL_MS,
      };
      throw error;
    }

    const typedUser = sessionUser as {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string | null;
    };

    const fullName = typedUser.name?.trim() || typedUser.email?.split('@')[0] || 'User';
    const mappedUser: KangurUser = {
      id: typedUser.id ?? typedUser.email ?? fullName,
      full_name: fullName,
      email: typedUser.email ?? null,
      role: typedUser.role === 'admin' ? 'admin' : 'user',
    };

    sessionUserCache = {
      user: mappedUser,
      isAnonymous: false,
      expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
    };
    return mappedUser;
  })();

  sessionUserInFlight = fetchPromise;

  try {
    return await fetchPromise;
  } finally {
    sessionUserInFlight = null;
  }
};

const buildScoresUrl = (params: {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  created_by?: string;
}): string => {
  const search = new URLSearchParams();

  if (params.sort) search.set('sort', params.sort);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.player_name) search.set('player_name', params.player_name);
  if (params.operation) search.set('operation', params.operation);
  if (params.created_by) search.set('created_by', params.created_by);

  const query = search.toString();
  return query ? `${KANGUR_SCORES_ENDPOINT}?${query}` : KANGUR_SCORES_ENDPOINT;
};

const requestScoresFromApi = async (url: string): Promise<KangurScoreRecord[]> => {
  const now = Date.now();
  const cached = scoreQueryCache.get(url);
  if (cached && cached.expiresAt > now) {
    return [...cached.rows];
  }

  const inFlight = scoreQueryInFlight.get(url);
  if (inFlight) {
    return inFlight;
  }

  const requestPromise = (async (): Promise<KangurScoreRecord[]> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: withCsrfHeaders(),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const requestError = new Error(`Kangur score list request failed with ${response.status}`) as Error & {
          status: number;
        };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = scoreListSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur score list payload validation failed.');
      }

      scoreQueryCache.set(url, {
        rows: parsed.data,
        expiresAt: Date.now() + SCORE_CACHE_TTL_MS,
      });

      return [...parsed.data];
    } catch (error: unknown) {
      logKangurClientError(error, {
        source: 'kangur.local-platform',
        action: 'score.list',
        method: 'GET',
        endpoint: url,
        ...(isStatusError(error) ? { statusCode: error.status } : {}),
      });
      throw error;
    } finally {
      scoreQueryInFlight.delete(url);
    }
  })();

  scoreQueryInFlight.set(url, requestPromise);

  return requestPromise;
};

const createScoreViaApi = async (input: KangurScoreCreateInput): Promise<KangurScoreRecord> => {
  try {
    const response = await fetch(KANGUR_SCORES_ENDPOINT, {
      method: 'POST',
      headers: withCsrfHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(`Kangur score create request failed with ${response.status}`) as Error & {
        status: number;
      };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurScoreSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur score create payload validation failed.');
    }
    clearScoreQueryCache();
    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'score.create',
      method: 'POST',
      endpoint: KANGUR_SCORES_ENDPOINT,
      operation: input.operation,
      ...(isStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const requestProgressFromApi = async (): Promise<KangurProgressRecord> => {
  try {
    const response = await fetch(KANGUR_PROGRESS_ENDPOINT, {
      method: 'GET',
      headers: withCsrfHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur progress request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = progressResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur progress payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'progress.get',
      method: 'GET',
      endpoint: KANGUR_PROGRESS_ENDPOINT,
      ...(isStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const updateProgressViaApi = async (input: KangurProgressRecord): Promise<KangurProgressRecord> => {
  try {
    const response = await fetch(KANGUR_PROGRESS_ENDPOINT, {
      method: 'PATCH',
      headers: withCsrfHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur progress update request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = progressResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur progress update payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'progress.update',
      method: 'PATCH',
      endpoint: KANGUR_PROGRESS_ENDPOINT,
      ...(isStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const createLocalKangurPlatform = (): KangurPlatform => {
  return {
    auth: {
      me: resolveSessionUser,
      redirectToLogin: (returnUrl: string) => {
        clearSessionUserCache();
        void signIn(undefined, { callbackUrl: returnUrl });
      },
      logout: async (returnUrl?: string) => {
        clearSessionUserCache();
        clearScoreQueryCache();
        if (returnUrl) {
          await signOut({ callbackUrl: returnUrl, redirect: true });
          return;
        }
        await signOut({ redirect: false });
      },
    },
    score: {
      create: async (input: KangurScoreCreateInput) => createScoreViaApi(input),
      list: async (sort?: string, limit?: number) =>
        requestScoresFromApi(
          buildScoresUrl({
            sort,
            limit: typeof limit === 'number' ? limit : DEFAULT_SCORE_LIMIT,
          })
        ),
      filter: async (criteria: Partial<KangurScoreRecord>, sort?: string, limit?: number) =>
        requestScoresFromApi(
          buildScoresUrl({
            sort,
            limit: typeof limit === 'number' ? limit : DEFAULT_SCORE_LIMIT,
            player_name: criteria.player_name,
            operation: criteria.operation,
            created_by: criteria.created_by ?? undefined,
          })
        ),
    },
    progress: {
      get: async () => requestProgressFromApi(),
      update: async (input: KangurProgressRecord) => updateProgressViaApi(input),
    },
  };
};
