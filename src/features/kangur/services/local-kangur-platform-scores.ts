import { z } from 'zod';
import {
  buildKangurScoreListPath,
  createKangurApiClient,
} from '@kangur/api-client';

import {
  hasGuestKangurScores,
  listGuestKangurScores,
  resetGuestKangurScoreSession,
  syncGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';
import { sortScores } from '@/features/kangur/services/kangur-score-repository/shared';
import type { KangurScoreCreateInput, KangurScoreRecord } from '@kangur/platform';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurScoreSchema, type KangurLessonSubject } from '@kangur/contracts';
import { reportKangurClientError, withKangurClientError } from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import { KANGUR_SCORES_ENDPOINT } from './local-kangur-platform-endpoints';
import { resolveSessionUser } from './local-kangur-platform-auth';
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

const buildScoresUrl = (params: {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  subject?: KangurLessonSubject;
  created_by?: string;
  learner_id?: string;
}): string => buildKangurScoreListPath(params);

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
      shouldReport: (error) => !isKangurAuthStatusError(error),
      shouldRethrow: (error) => !isKangurAuthStatusError(error),
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

export const requestMergedScores = async (params: {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  subject?: KangurLessonSubject;
  created_by?: string;
  learner_id?: string;
}): Promise<KangurScoreRecord[]> => {
  let syncError: unknown = null;
  if (hasGuestKangurScores()) {
    try {
      await syncGuestScoresToApiIfAuthenticated();
    } catch (error: unknown) {
      void ErrorSystem.captureException(error);
      reportKangurClientError(error, {
        source: 'kangur.local-platform',
        action: 'score.syncGuest',
        description: 'Guest score sync failed before listing scores.',
      });
      syncError = error;
    }
  }

  const localRows = listGuestKangurScores({
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
    void ErrorSystem.captureException(error);
    reportKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'score.list',
      description: 'Failed to load remote scores while merging with guest scores.',
      context: {
        endpoint: url,
      },
    });
    if (localRows.length > 0) {
      return localRows;
    }
    throw syncError ?? error;
  }
};

const requestScoresFromApi = async (
  url: string,
  query: {
    sort?: string;
    limit?: number;
    player_name?: string;
    operation?: string;
    subject?: KangurLessonSubject;
    created_by?: string;
    learner_id?: string;
  }
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

  const requestPromise = (async (): Promise<KangurScoreRecord[]> => {
    try {
      return await withKangurClientError(
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
          shouldRethrow: () => true,
          onError: (error) => {
            trackReadFailure('score.list', error, {
              endpoint: url,
              method: 'GET',
            });
          },
        }
      );
    } finally {
      scoreQueryInFlight.delete(url);
    }
  })();

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
