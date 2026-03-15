import { z } from 'zod';

import {
  getKangurLoginHref,
  resolveKangurPublicBasePathFromHref,
} from '@/features/kangur/config/routing';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import {
  createGuestKangurScore,
  hasGuestKangurScores,
  listGuestKangurScores,
  resetGuestKangurScoreSession,
  syncGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';
import {
  clearStoredActiveLearnerId,
  getStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import { sortScores } from '@/features/kangur/services/kangur-score-repository/shared';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
  KangurLearnerSessionHistory,
  KangurLearnerInteractionHistory,
  KangurLearnerCreateInput,
  KangurLearnerProfile,
  KangurLearnerUpdateInput,
  KangurPlatform,
  KangurProgressUpdateContext,
  KangurScoreCreateInput,
  KangurScoreRecord,
  KangurUser,
} from '@/features/kangur/services/ports';
import {
  isKangurAuthStatusError,
  isKangurStatusError,
} from '@/features/kangur/services/status-errors';
import {
  kangurAuthUserSchema,
  kangurAssignmentSnapshotSchema,
  kangurLearnerProfileSchema,
  kangurLearnerActivitySnapshotSchema,
  kangurLearnerActivityStatusSchema,
  kangurLearnerSessionHistorySchema,
  kangurLearnerInteractionHistorySchema,
  kangurProgressStateSchema,
  kangurScoreSchema,
  type KangurProgressState,
} from '@/shared/contracts/kangur';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const KANGUR_AUTH_ME_ENDPOINT = '/api/kangur/auth/me';
const KANGUR_LOGOUT_ENDPOINT = '/api/kangur/auth/logout';
const KANGUR_PROGRESS_ENDPOINT = '/api/kangur/progress';
const KANGUR_SCORES_ENDPOINT = '/api/kangur/scores';
const KANGUR_ASSIGNMENTS_ENDPOINT = '/api/kangur/assignments';
const KANGUR_LEARNERS_ENDPOINT = '/api/kangur/learners';
const KANGUR_LEARNER_ACTIVITY_ENDPOINT = '/api/kangur/learner-activity';
const KANGUR_LEARNER_SESSIONS_ENDPOINT = '/api/kangur/learners';
const KANGUR_LEARNER_INTERACTIONS_ENDPOINT = '/api/kangur/learners';
const DEFAULT_SCORE_LIMIT = 100;
const AUTH_CACHE_TTL_MS = 30_000;
const ANONYMOUS_AUTH_CACHE_TTL_MS = 8_000;
const SCORE_CACHE_TTL_MS = 12_000;
const KANGUR_ACTIVE_LEARNER_HEADER = 'x-kangur-learner-id';
const KANGUR_PROGRESS_SOURCE_HEADER = 'x-kangur-progress-source';
const KANGUR_PROGRESS_CTA_HEADER = 'x-kangur-progress-cta';
const KANGUR_PROGRESS_CTA_SOURCE = 'lesson_panel_navigation';
const progressResponseSchema = kangurProgressStateSchema;
const scoreListSchema = z.array(kangurScoreSchema);
const assignmentListSchema = z.array(kangurAssignmentSnapshotSchema);
const learnerProfileSchema = kangurLearnerProfileSchema;
const learnerActivityStatusSchema = kangurLearnerActivityStatusSchema;
const learnerSessionHistorySchema = kangurLearnerSessionHistorySchema;
const learnerInteractionHistorySchema = kangurLearnerInteractionHistorySchema;

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

const prepareLoginHref = (returnUrl: string): string => {
  clearSessionUserCache();
  clearScoreQueryCache();
  const basePath = resolveKangurPublicBasePathFromHref(returnUrl, window.location.origin);
  return getKangurLoginHref(basePath, returnUrl);
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

const toErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : 'Unknown error';

const trackWriteSuccess = (action: string, context: Record<string, unknown> = {}): void => {
  trackKangurClientEvent('kangur_api_write_succeeded', {
    action,
    ...context,
  });
};

const trackWriteFailure = (
  action: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void => {
  trackKangurClientEvent('kangur_api_write_failed', {
    action,
    errorMessage: toErrorMessage(error),
    ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    ...context,
  });
};

const trackReadFailure = (
  action: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void => {
  trackKangurClientEvent('kangur_api_read_failed', {
    action,
    errorMessage: toErrorMessage(error),
    ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    ...context,
  });
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
      cache: 'no-store',
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

const getScoreDedupKey = (score: KangurScoreRecord): string =>
  score.client_mutation_id?.trim() || score.id;

const mergeScoreRows = (input: {
  localRows: KangurScoreRecord[];
  remoteRows: KangurScoreRecord[];
  sort?: string;
  limit?: number;
}): KangurScoreRecord[] => {
  const mergedRows = new Map<string, KangurScoreRecord>();

  input.localRows.forEach((score) => {
    mergedRows.set(getScoreDedupKey(score), score);
  });
  input.remoteRows.forEach((score) => {
    mergedRows.set(getScoreDedupKey(score), score);
  });

  const limit = typeof input.limit === 'number' ? input.limit : DEFAULT_SCORE_LIMIT;
  return sortScores(Array.from(mergedRows.values()), input.sort).slice(0, limit);
};

const syncGuestScoresToApiIfAuthenticated = async (): Promise<void> => {
  if (!hasGuestKangurScores()) {
    return;
  }

  try {
    await resolveSessionUser();
  } catch (error: unknown) {
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      return;
    }
    throw error;
  }

  const result = await syncGuestKangurScores({
    persistScore: (payload) => createScoreViaApi(payload),
  });
  if (result.syncedCount > 0) {
    if (result.remainingCount === 0) {
      resetGuestKangurScoreSession();
    }
    clearScoreQueryCache();
  }
};

const requestMergedScores = async (params: {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  created_by?: string;
  learner_id?: string;
}): Promise<KangurScoreRecord[]> => {
  let syncError: unknown = null;
  if (hasGuestKangurScores()) {
    try {
      await syncGuestScoresToApiIfAuthenticated();
    } catch (error: unknown) {
      logClientError(error);
      syncError = error;
    }
  }

  const localRows = listGuestKangurScores({
    sort: params.sort,
    limit: typeof params.limit === 'number' ? params.limit : DEFAULT_SCORE_LIMIT,
    filters: {
      player_name: params.player_name,
      operation: params.operation,
      created_by: params.created_by,
      learner_id: params.learner_id,
    },
  });
  const url = buildScoresUrl(params);

  try {
    const remoteRows = await requestScoresFromApi(url);
    return mergeScoreRows({
      localRows,
      remoteRows,
      sort: params.sort,
      limit: params.limit,
    });
  } catch (error: unknown) {
    logClientError(error);
    if (localRows.length > 0) {
      return localRows;
    }
    throw syncError ?? error;
  }
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
      logClientError(error);
      trackReadFailure('score.list', error, {
        endpoint: url,
        method: 'GET',
      });
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
    trackWriteSuccess('score.create', {
      endpoint: KANGUR_SCORES_ENDPOINT,
      method: 'POST',
      operation: parsed.data.operation,
      score: parsed.data.score,
      totalQuestions: parsed.data.total_questions,
      correctAnswers: parsed.data.correct_answers,
      learnerId: parsed.data.learner_id ?? null,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('score.create', error, {
      endpoint: KANGUR_SCORES_ENDPOINT,
      method: 'POST',
      operation: input.operation,
    });
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

const requestProgressFromApi = async (): Promise<KangurProgressState> => {
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
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('progress.get', error, {
      endpoint: KANGUR_PROGRESS_ENDPOINT,
      method: 'GET',
    });
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
  return serialized.length > 0
    ? `${KANGUR_ASSIGNMENTS_ENDPOINT}?${serialized}`
    : KANGUR_ASSIGNMENTS_ENDPOINT;
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
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('assignments.list', error, {
      endpoint: url,
      method: 'GET',
      includeArchived: query?.includeArchived ?? false,
    });
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

    trackWriteSuccess('assignments.create', {
      endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
      method: 'POST',
      assignmentId: parsed.data.id,
      targetType: parsed.data.target.type,
      status: parsed.data.progress.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('assignments.create', error, {
      endpoint: KANGUR_ASSIGNMENTS_ENDPOINT,
      method: 'POST',
      targetType: input.target.type,
    });
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

    trackWriteSuccess('assignments.update', {
      endpoint,
      method: 'PATCH',
      assignmentId: parsed.data.id,
      status: parsed.data.progress.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('assignments.update', error, {
      endpoint,
      method: 'PATCH',
      assignmentId: id,
    });
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

const reassignAssignmentViaApi = async (id: string): Promise<KangurAssignmentSnapshot> => {
  const endpoint = `${KANGUR_ASSIGNMENTS_ENDPOINT}/${encodeURIComponent(id)}/reassign`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur assignment reassign request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurAssignmentSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur assignment reassign payload validation failed.');
    }

    trackWriteSuccess('assignments.reassign', {
      endpoint,
      method: 'POST',
      assignmentId: parsed.data.id,
      status: parsed.data.progress.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('assignments.reassign', error, {
      endpoint,
      method: 'POST',
      assignmentId: id,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'assignments.reassign',
      method: 'POST',
      endpoint,
      assignmentId: id,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const updateProgressViaApi = async (
  input: KangurProgressState,
  context?: KangurProgressUpdateContext
): Promise<KangurProgressState> => {
  try {
    const progressHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (context?.source === KANGUR_PROGRESS_CTA_SOURCE) {
      progressHeaders[KANGUR_PROGRESS_SOURCE_HEADER] = context.source;
    }
    if (context?.cta?.trim()) {
      progressHeaders[KANGUR_PROGRESS_CTA_HEADER] = context.cta.trim();
    }

    const response = await fetch(KANGUR_PROGRESS_ENDPOINT, {
      method: 'PATCH',
      headers: createActorAwareHeaders(progressHeaders),
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

    trackWriteSuccess('progress.update', {
      endpoint: KANGUR_PROGRESS_ENDPOINT,
      method: 'PATCH',
      totalXp: parsed.data.totalXp,
      gamesPlayed: parsed.data.gamesPlayed,
      lessonsCompleted: parsed.data.lessonsCompleted,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('progress.update', error, {
      endpoint: KANGUR_PROGRESS_ENDPOINT,
      method: 'PATCH',
      totalXp: input.totalXp,
      gamesPlayed: input.gamesPlayed,
    });
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

const requestLearnerActivityStatus = async (): Promise<KangurLearnerActivityStatus> => {
  try {
    const response = await fetch(KANGUR_LEARNER_ACTIVITY_ENDPOINT, {
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur learner activity request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = learnerActivityStatusSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur learner activity payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('learnerActivity.get', error, {
      endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
      method: 'GET',
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learnerActivity.get',
      method: 'GET',
      endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const updateLearnerActivityViaApi = async (
  input: KangurLearnerActivityUpdateInput
): Promise<KangurLearnerActivitySnapshot> => {
  try {
    const response = await fetch(KANGUR_LEARNER_ACTIVITY_ENDPOINT, {
      method: 'POST',
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur learner activity update failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurLearnerActivitySnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur learner activity update payload validation failed.');
    }

    trackWriteSuccess('learnerActivity.update', {
      endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
      method: 'POST',
      kind: parsed.data.kind,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('learnerActivity.update', error, {
      endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
      method: 'POST',
      kind: input.kind,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learnerActivity.update',
      method: 'POST',
      endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
      kind: input.kind,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const buildLearnerSessionsUrl = (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): string => {
  const base = `${KANGUR_LEARNER_SESSIONS_ENDPOINT}/${encodeURIComponent(learnerId)}/sessions`;
  const params = new URLSearchParams();
  if (typeof options?.limit === 'number' && Number.isFinite(options.limit)) {
    params.set('limit', String(Math.max(1, Math.floor(options.limit))));
  }
  if (typeof options?.offset === 'number' && Number.isFinite(options.offset)) {
    params.set('offset', String(Math.max(0, Math.floor(options.offset))));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

const requestLearnerSessions = async (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): Promise<KangurLearnerSessionHistory> => {
  const endpoint = buildLearnerSessionsUrl(learnerId, options);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur learner sessions request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = learnerSessionHistorySchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur learner sessions payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('learnerSessions.list', error, {
      endpoint,
      method: 'GET',
      learnerId,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learnerSessions.list',
      method: 'GET',
      endpoint,
      learnerId,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const buildLearnerInteractionsUrl = (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): string => {
  const base = `${KANGUR_LEARNER_INTERACTIONS_ENDPOINT}/${encodeURIComponent(
    learnerId
  )}/interactions`;
  const params = new URLSearchParams();
  if (typeof options?.limit === 'number' && Number.isFinite(options.limit)) {
    params.set('limit', String(Math.max(1, Math.floor(options.limit))));
  }
  if (typeof options?.offset === 'number' && Number.isFinite(options.offset)) {
    params.set('offset', String(Math.max(0, Math.floor(options.offset))));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

const requestLearnerInteractions = async (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): Promise<KangurLearnerInteractionHistory> => {
  const endpoint = buildLearnerInteractionsUrl(learnerId, options);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const requestError = new Error(
        `Kangur learner interactions request failed with ${response.status}`
      ) as Error & { status: number };
      requestError.status = response.status;
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = learnerInteractionHistorySchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur learner interactions payload validation failed.');
    }

    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('learnerInteractions.list', error, {
      endpoint,
      method: 'GET',
      learnerId,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learnerInteractions.list',
      method: 'GET',
      endpoint,
      learnerId,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const looksLikeHtml = (value: string): boolean =>
  /<!doctype|<html|<head|<body/i.test(value);

const createLearnerViaApi = async (
  input: KangurLearnerCreateInput
): Promise<KangurLearnerProfile> => {
  try {
    const response = await fetch(KANGUR_LEARNERS_ENDPOINT, {
      method: 'POST',
      headers: createActorAwareHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let errorMessage = `Kangur learner create request failed with ${response.status}`;
      let errorDetails: unknown = null;
      const errorId = response.headers.get('x-error-id');

      try {
        const responseText = await response.text();
        if (responseText.trim().length > 0) {
          try {
            const payload = JSON.parse(responseText) as Record<string, unknown>;
            if (typeof payload['error'] === 'string') {
              errorMessage = payload['error'];
            } else if (!looksLikeHtml(responseText)) {
              errorMessage = responseText.trim().slice(0, 240);
            }
            if (payload['details'] !== undefined) {
              errorDetails = payload['details'];
            }
          } catch (error) {
            logClientError(error);
            if (!looksLikeHtml(responseText)) {
              errorMessage = responseText.trim().slice(0, 240);
            }
          }
        }
      } catch (error) {
        logClientError(error);
      
        // Ignore response body parsing failures.
      }

      const error = new Error(errorMessage) as Error & {
        status: number;
        details?: unknown;
        errorId?: string;
      };
      error.status = response.status;
      if (errorDetails) {
        error.details = errorDetails;
      }
      if (errorId) {
        error.errorId = errorId;
      }
      throw error;
    }

    const payload = (await response.json()) as unknown;
    const parsed = learnerProfileSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur learner create payload validation failed.');
    }
    clearSessionUserCache();
    trackWriteSuccess('learners.create', {
      endpoint: KANGUR_LEARNERS_ENDPOINT,
      method: 'POST',
      learnerId: parsed.data.id,
      learnerStatus: parsed.data.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('learners.create', error, {
      endpoint: KANGUR_LEARNERS_ENDPOINT,
      method: 'POST',
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learners.create',
      method: 'POST',
      endpoint: KANGUR_LEARNERS_ENDPOINT,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const updateLearnerViaApi = async (
  id: string,
  input: KangurLearnerUpdateInput
): Promise<KangurLearnerProfile> => {
  const endpoint = `${KANGUR_LEARNERS_ENDPOINT}/${encodeURIComponent(id)}`;
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
      const error = new Error(
        `Kangur learner update request failed with ${response.status}`
      ) as Error & {
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
    trackWriteSuccess('learners.update', {
      endpoint,
      method: 'PATCH',
      learnerId: parsed.data.id,
      learnerStatus: parsed.data.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('learners.update', error, {
      endpoint,
      method: 'PATCH',
      learnerId: id,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learners.update',
      method: 'PATCH',
      endpoint,
      learnerId: id,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const deleteLearnerViaApi = async (id: string): Promise<KangurLearnerProfile> => {
  const endpoint = `${KANGUR_LEARNERS_ENDPOINT}/${encodeURIComponent(id)}`;
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: createActorAwareHeaders(),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const error = new Error(
        `Kangur learner delete request failed with ${response.status}`
      ) as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }

    const payload = (await response.json()) as unknown;
    const parsed = learnerProfileSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error('Kangur learner delete payload validation failed.');
    }
    clearSessionUserCache();
    clearScoreQueryCache();
    clearStoredActiveLearnerId();
    trackWriteSuccess('learners.delete', {
      endpoint,
      method: 'DELETE',
      learnerId: parsed.data.id,
      learnerStatus: parsed.data.status,
    });
    return parsed.data;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('learners.delete', error, {
      endpoint,
      method: 'DELETE',
      learnerId: id,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learners.delete',
      method: 'DELETE',
      endpoint,
      learnerId: id,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

const selectLearner = async (learnerId: string): Promise<KangurUser> => {
  try {
    setStoredActiveLearnerId(learnerId);
    clearScoreQueryCache();
    clearSessionUserCache();
    const user = await resolveSessionUser();
    trackWriteSuccess('learners.select', {
      learnerId,
      actorType: user.actorType,
      activeLearnerId: user.activeLearner?.id ?? null,
    });
    return user;
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('learners.select', error, {
      learnerId,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'learners.select',
      learnerId,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const createLocalKangurPlatform = (): KangurPlatform => {
  return {
    auth: {
      me: resolveSessionUser,
      prepareLoginHref,
      redirectToLogin: (returnUrl: string) => {
        window.location.assign(prepareLoginHref(returnUrl));
      },
      logout: async (returnUrl?: string) => {
        clearSessionUserCache();
        clearScoreQueryCache();
        clearStoredActiveLearnerId();
        resetGuestKangurScoreSession();
        await fetch(KANGUR_LOGOUT_ENDPOINT, {
          method: 'POST',
          headers: withCsrfHeaders(),
          credentials: 'same-origin',
        }).catch(() => {});
        if (returnUrl) {
          window.location.assign(returnUrl);
          return;
        }
      },
    },
    learners: {
      create: async (input: KangurLearnerCreateInput) => createLearnerViaApi(input),
      update: async (id: string, input: KangurLearnerUpdateInput) => updateLearnerViaApi(id, input),
      delete: async (id: string) => deleteLearnerViaApi(id),
      select: async (id: string) => selectLearner(id),
    },
    score: {
      create: async (input: KangurScoreCreateInput) => {
        try {
          await resolveSessionUser();
          return await createScoreViaApi(input);
        } catch (error: unknown) {
          logClientError(error);
          if (!isKangurAuthStatusError(error)) {
            throw error;
          }

          return createGuestKangurScore(input);
        }
      },
      list: async (sort?: string, limit?: number) =>
        requestMergedScores({
          sort,
          limit: typeof limit === 'number' ? limit : DEFAULT_SCORE_LIMIT,
        }),
      filter: async (criteria: Partial<KangurScoreRecord>, sort?: string, limit?: number) =>
        requestMergedScores({
          sort,
          limit: typeof limit === 'number' ? limit : DEFAULT_SCORE_LIMIT,
          player_name: criteria.player_name,
          operation: criteria.operation,
          created_by: criteria.created_by ?? undefined,
          learner_id: typeof criteria.learner_id === 'string' ? criteria.learner_id : undefined,
        }),
    },
    progress: {
      get: async () => requestProgressFromApi(),
      update: async (input: KangurProgressState, context?: KangurProgressUpdateContext) =>
        updateProgressViaApi(input, context),
    },
    assignments: {
      list: async (query?: KangurAssignmentListQuery) => requestAssignmentsFromApi(query),
      create: async (input: KangurAssignmentCreateInput) => createAssignmentViaApi(input),
      update: async (id: string, input: KangurAssignmentUpdateInput) =>
        updateAssignmentViaApi(id, input),
      reassign: async (id: string) => reassignAssignmentViaApi(id),
    },
    learnerActivity: {
      get: async () => requestLearnerActivityStatus(),
      update: async (input: KangurLearnerActivityUpdateInput) => updateLearnerActivityViaApi(input),
    },
    learnerSessions: {
      list: async (learnerId: string, options?: { limit?: number; offset?: number }) =>
        requestLearnerSessions(learnerId, options),
    },
    learnerInteractions: {
      list: async (learnerId: string, options?: { limit?: number; offset?: number }) =>
        requestLearnerInteractions(learnerId, options),
    },
  };
};
