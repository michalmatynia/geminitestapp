'use client';

import { signOut } from 'next-auth/react';
import { z } from 'zod';

import {
  kangurAuthUserSchema,
  kangurAssignmentSnapshotSchema,
  kangurLearnerProfileSchema,
  kangurProgressStateSchema,
  kangurScoreSchema,
} from '@/shared/contracts/kangur';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurLearnerCreateInput,
  KangurLearnerProfile,
  KangurLearnerUpdateInput,
  KangurPlatform,
  KangurProgressRecord,
  KangurScoreCreateInput,
  KangurScoreRecord,
  KangurUser,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { logKangurClientError } from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  getStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';

const KANGUR_AUTH_ME_ENDPOINT = '/api/kangur/auth/me';
const KANGUR_LEARNER_SIGNOUT_ENDPOINT = '/api/kangur/auth/learner-signout';
const KANGUR_PROGRESS_ENDPOINT = '/api/kangur/progress';
const KANGUR_SCORES_ENDPOINT = '/api/kangur/scores';
const KANGUR_ASSIGNMENTS_ENDPOINT = '/api/kangur/assignments';
const KANGUR_LEARNERS_ENDPOINT = '/api/kangur/learners';
const DEFAULT_SCORE_LIMIT = 100;
const AUTH_CACHE_TTL_MS = 30_000;
const ANONYMOUS_AUTH_CACHE_TTL_MS = 8_000;
const SCORE_CACHE_TTL_MS = 12_000;
const KANGUR_ACTIVE_LEARNER_HEADER = 'x-kangur-learner-id';
const progressResponseSchema = kangurProgressStateSchema;
const scoreListSchema = z.array(kangurScoreSchema);
const assignmentListSchema = z.array(kangurAssignmentSnapshotSchema);
const learnerProfileSchema = kangurLearnerProfileSchema;

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

const clearScoreQueryCache = (): void => {
  scoreQueryCache.clear();
  scoreQueryInFlight.clear();
};

const clearSessionUserCache = (): void => {
  sessionUserCache = null;
  sessionUserInFlight = null;
};

const createActorAwareHeaders = (headers?: HeadersInit): Headers => {
  const nextHeaders = withCsrfHeaders(headers);
  const activeLearnerId = getStoredActiveLearnerId();
  if (activeLearnerId && !nextHeaders.has(KANGUR_ACTIVE_LEARNER_HEADER)) {
    nextHeaders.set(KANGUR_ACTIVE_LEARNER_HEADER, activeLearnerId);
  }
  return nextHeaders;
};

const cacheResolvedUser = (user: KangurUser | null, anonymous = false): void => {
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
    const response = await fetch(KANGUR_AUTH_ME_ENDPOINT, {
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const error = unauthorizedError();
      error.status = response.status;
      if (response.status === 401 || response.status === 403) {
        cacheResolvedUser(null, true);
      }
      throw error;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAuthUserSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur auth payload validation failed.');
    }

    const mappedUser = parsed.data;
    if (!mappedUser.activeLearner) {
      const error = unauthorizedError();
      cacheResolvedUser(null, true);
      throw error;
    }
    syncActiveLearnerStorage(mappedUser);
    cacheResolvedUser(mappedUser, false);
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
  learner_id?: string;
}): string => {
  const search = new URLSearchParams();

  if (params.sort) search.set('sort', params.sort);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.player_name) search.set('player_name', params.player_name);
  if (params.operation) search.set('operation', params.operation);
  if (params.created_by) search.set('created_by', params.created_by);
  if (params.learner_id) search.set('learner_id', params.learner_id);

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
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const requestError = new Error(
          `Kangur score list request failed with ${response.status}`
        ) as Error & {
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
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
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
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur score create request failed with ${response.status}`
      ) as Error & {
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
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const requestProgressFromApi = async (): Promise<KangurProgressRecord> => {
  try {
    const response = await fetch(KANGUR_PROGRESS_ENDPOINT, {
      method: 'GET',
      headers: createActorAwareHeaders(),
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
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'progress.get',
      method: 'GET',
      endpoint: KANGUR_PROGRESS_ENDPOINT,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const buildAssignmentsUrl = (query?: KangurAssignmentListQuery): string => {
  const search = new URLSearchParams();

  if (query?.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const serialized = search.toString();
  return serialized.length > 0 ? `${KANGUR_ASSIGNMENTS_ENDPOINT}?${serialized}` : KANGUR_ASSIGNMENTS_ENDPOINT;
};

const requestAssignmentsFromApi = async (
  query?: KangurAssignmentListQuery
): Promise<KangurAssignmentSnapshot[]> => {
  const url = buildAssignmentsUrl(query);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment list request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = assignmentListSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment list payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.list',
      method: 'GET',
      endpoint: url,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const createAssignmentViaApi = async (
  input: KangurAssignmentCreateInput
): Promise<KangurAssignmentSnapshot> => {
  try {
    const response = await fetch(KANGUR_ASSIGNMENTS_ENDPOINT, {
      method: 'POST',
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment create request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAssignmentSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment create payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.create',
      method: 'POST',
      endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
      targetType: input.target.type,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const updateAssignmentViaApi = async (
  id: string,
  input: KangurAssignmentUpdateInput
): Promise<KangurAssignmentSnapshot> => {
  const endpoint = `${KANGUR_ASSIGNMENTS_ENDPOINT}/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment update request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAssignmentSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment update payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.update',
      method: 'PATCH',
      endpoint,
      assignmentId: id,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const updateProgressViaApi = async (input: KangurProgressRecord): Promise<KangurProgressRecord> => {
  try {
    const response = await fetch(KANGUR_PROGRESS_ENDPOINT, {
      method: 'PATCH',
      headers: createActorAwareHeaders({
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
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const createLearnerViaApi = async (input: KangurLearnerCreateInput): Promise<KangurLearnerProfile> => {
  const response = await fetch(KANGUR_LEARNERS_ENDPOINT, {
    method: 'POST',
    headers: createActorAwareHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = new Error(`Kangur learner create request failed with ${response.status}`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  const payload = (await response.json()) as unknown;
  const parsed = learnerProfileSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('Kangur learner create payload validation failed.');
  }
  clearSessionUserCache();
  return parsed.data;
};

const updateLearnerViaApi = async (
  id: string,
  input: KangurLearnerUpdateInput
): Promise<KangurLearnerProfile> => {
  const endpoint = `${KANGUR_LEARNERS_ENDPOINT}/${encodeURIComponent(id)}`;
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: createActorAwareHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = new Error(`Kangur learner update request failed with ${response.status}`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  const payload = (await response.json()) as unknown;
  const parsed = learnerProfileSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('Kangur learner update payload validation failed.');
  }
  clearSessionUserCache();
  return parsed.data;
};

const selectLearner = async (learnerId: string): Promise<KangurUser> => {
  setStoredActiveLearnerId(learnerId);
  clearScoreQueryCache();
  clearSessionUserCache();
  return resolveSessionUser();
};

export const createLocalKangurPlatform = (): KangurPlatform => {
  return {
    auth: {
      me: resolveSessionUser,
      redirectToLogin: (returnUrl: string) => {
        clearSessionUserCache();
        clearScoreQueryCache();
        const loginUrl = new URL('/kangur/login', window.location.origin);
        loginUrl.searchParams.set('callbackUrl', returnUrl);
        window.location.assign(loginUrl.toString());
      },
      logout: async (returnUrl?: string) => {
        clearSessionUserCache();
        clearScoreQueryCache();
        clearStoredActiveLearnerId();
        await fetch(KANGUR_LEARNER_SIGNOUT_ENDPOINT, {
          method: 'POST',
          headers: withCsrfHeaders(),
          credentials: 'same-origin',
        }).catch(() => {});
        if (returnUrl) {
          await signOut({ callbackUrl: returnUrl, redirect: true });
          return;
        }
        await signOut({ redirect: false });
      },
    },
    learners: {
      create: async (input: KangurLearnerCreateInput) => createLearnerViaApi(input),
      update: async (id: string, input: KangurLearnerUpdateInput) => updateLearnerViaApi(id, input),
      select: async (id: string) => selectLearner(id),
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
            learner_id:
              typeof criteria.learner_id === 'string' ? criteria.learner_id : undefined,
          })
        ),
    },
    progress: {
      get: async () => requestProgressFromApi(),
      update: async (input: KangurProgressRecord) => updateProgressViaApi(input),
    },
    assignments: {
      list: async (query?: KangurAssignmentListQuery) => requestAssignmentsFromApi(query),
      create: async (input: KangurAssignmentCreateInput) => createAssignmentViaApi(input),
      update: async (id: string, input: KangurAssignmentUpdateInput) =>
        updateAssignmentViaApi(id, input),
    },
  };
};
