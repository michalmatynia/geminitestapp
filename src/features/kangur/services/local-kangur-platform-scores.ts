import { z } from 'zod';
import { createKangurApiClient } from '@kangur/api-client';

import {
  hasGuestKangurScores,
  listGuestKangurScores,
  resetGuestKangurScoreSession,
  syncGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';
import type { KangurScoreCreateInput, KangurScoreRecord } from '@kangur/platform';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurScoreSchema } from '@kangur/contracts/kangur';
import { type KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';
import {
  isRecoverableKangurClientFetchError,
  reportKangurClientError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import { KANGUR_SCORES_ENDPOINT } from './local-kangur-platform-endpoints';
import { resolveSessionUser } from './local-kangur-platform-auth';
import { isRecoverableScoreListReadError } from './local-kangur-platform-score-errors';
import {
  clearScoreQueryCache,
  scoreQueryCache,
  scoreQueryInFlight,
} from './local-kangur-platform-score-cache';
import {
  createKangurClientFallback,
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteSuccess,
  trackWriteFailure,
} from './local-kangur-platform-shared';

const DEFAULT_SCORE_LIMIT = 100;
const SCORE_CACHE_TTL_MS = 12_000;
const scoreListSchema = z.array(kangurScoreSchema);

const kangurScoreApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

import {
  mergeScoreRows,
  buildScoresUrl,
} from '@/features/kangur/services/scores';

type ScoreListQuery = {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  subject?: KangurLessonSubject;
  created_by?: string;
  learner_id?: string;
};

const syncGuestScoresToApiIfAuthenticated = async (): Promise<void> => {
  if (!hasGuestKangurScores()) {
    return;
  }

  const user = await withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'score.syncGuest',
      description: 'Resolve session before syncing guest scores.',
      context: {
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    () => resolveSessionUser(),
    {
      fallback: null,
      shouldReport: (error) =>
        !isKangurAuthStatusError(error) && !isRecoverableKangurClientFetchError(error),
      shouldRethrow: (error) =>
        !isKangurAuthStatusError(error) && !isRecoverableKangurClientFetchError(error),
    }
  );

  if (!user) {
    return;
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

const reportGuestScoreSyncError = (error: unknown): void => {
  if (isRecoverableKangurClientFetchError(error)) return;
  void ErrorSystem.captureException(error);
  reportKangurClientError(error, {
    source: 'kangur.local-platform',
    action: 'score.syncGuest',
    description: 'Guest score sync failed before listing scores.',
  });
};

const syncGuestScoresBeforeList = async (): Promise<unknown> => {
  if (!hasGuestKangurScores()) return null;
  try {
    await syncGuestScoresToApiIfAuthenticated();
    return null;
  } catch (error: unknown) {
    reportGuestScoreSyncError(error);
    return error;
  }
};

const listLocalGuestScores = (params: ScoreListQuery): KangurScoreRecord[] =>
  listGuestKangurScores({
    sort: params.sort,
    limit: typeof params.limit === 'number' ? params.limit : DEFAULT_SCORE_LIMIT,
    filters: {
      player_name: params.player_name,
      operation: params.operation,
      subject: params.subject,
      created_by: params.created_by,
      learner_id: params.learner_id,
    },
  });

const reportRemoteScoreListError = (error: unknown, url: string): void => {
  if (isRecoverableKangurClientFetchError(error)) return;
  void ErrorSystem.captureException(error);
  reportKangurClientError(error, {
    source: 'kangur.local-platform',
    action: 'score.list',
    description: 'Failed to load remote scores while merging with guest scores.',
    context: {
      endpoint: url,
    },
  });
};

const handleRemoteScoreListError = (input: {
  error: unknown;
  localRows: KangurScoreRecord[];
  syncError: unknown;
  url: string;
}): KangurScoreRecord[] => {
  if (isRecoverableScoreListReadError(input.error)) return input.localRows;
  reportRemoteScoreListError(input.error, input.url);
  if (input.localRows.length > 0) return input.localRows;
  throw input.syncError ?? input.error;
};

export const requestMergedScores = async (
  params: ScoreListQuery
): Promise<KangurScoreRecord[]> => {
  const syncError = await syncGuestScoresBeforeList();
  const localRows = listLocalGuestScores(params);
  const url = buildScoresUrl(params);

  try {
    const remoteRows = await requestScoresFromApi(url, params);
    return mergeScoreRows({
      localRows,
      remoteRows,
      sort: params.sort,
      limit: params.limit,
    });
  } catch (error: unknown) {
    return handleRemoteScoreListError({ error, localRows, syncError, url });
  }
};

const fetchScoresFromApi = async (
  url: string,
  query: ScoreListQuery
): Promise<KangurScoreRecord[]> =>
  withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'score.list',
      description: 'Fetch score list from the Kangur API.',
      context: {
        endpoint: url,
        method: 'GET',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurScoreApiClient.listScores(query);
      const parsed = scoreListSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur score list payload validation failed.');
      }

      scoreQueryCache.set(url, {
        rows: parsed.data,
        expiresAt: Date.now() + SCORE_CACHE_TTL_MS,
      });

      return [...parsed.data];
    },
    {
      fallback: [] as KangurScoreRecord[],
      shouldReport: (error) => !isRecoverableScoreListReadError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isRecoverableScoreListReadError(error)) return;
        trackReadFailure('score.list', error, {
          endpoint: url,
          method: 'GET',
        });
      },
    }
  );

const requestScoresFromApi = async (
  url: string,
  query: ScoreListQuery
): Promise<KangurScoreRecord[]> => {
  const now = Date.now();
  const cached = scoreQueryCache.get(url);
  if (cached && cached.expiresAt > now) {
    return [...cached.rows];
  }

  const inFlight = scoreQueryInFlight.get(url);
  if (inFlight) {
    return inFlight;
  }

  const requestPromise = fetchScoresFromApi(url, query)
    .finally((): void => {
      scoreQueryInFlight.delete(url);
    });

  scoreQueryInFlight.set(url, requestPromise);

  return requestPromise;
};

export const createScoreViaApi = async (
  input: KangurScoreCreateInput
): Promise<KangurScoreRecord> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'score.create',
      description: 'Create a new score entry via the Kangur API.',
      context: {
        endpoint: KANGUR_SCORES_ENDPOINT,
        method: 'POST',
        operation: input.operation,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurScoreApiClient.createScore(input);
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
    },
    {
      fallback: createKangurClientFallback('score.create'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('score.create', error, {
          endpoint: KANGUR_SCORES_ENDPOINT,
          method: 'POST',
          operation: input.operation,
        });
      },
    }
  );
};
