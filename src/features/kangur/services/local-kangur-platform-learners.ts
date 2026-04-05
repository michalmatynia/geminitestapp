import {
  buildKangurLearnerInteractionsPath,
  buildKangurLearnerSessionsPath,
  createKangurApiClient,
} from '@kangur/api-client';
import type {
  KangurLearnerCreateInput,
  KangurLearnerInteractionHistory,
  KangurLearnerProfile,
  KangurLearnerSessionHistory,
  KangurLearnerUpdateInput,
  KangurUser,
} from '@kangur/platform';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurLearnerProfileSchema, kangurLearnerSessionHistorySchema, kangurLearnerInteractionHistorySchema } from '@kangur/contracts/kangur';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';

import {
  KANGUR_LEARNERS_ENDPOINT,
} from './local-kangur-platform-endpoints';
import { clearSessionUserCache, resolveSessionUser } from './local-kangur-platform-auth';
import { clearScoreQueryCache } from './local-kangur-platform-score-cache';
import {
  createKangurClientFallback,
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const kangurLearnersApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

export const createLearnerViaApi = async (
  input: KangurLearnerCreateInput
): Promise<KangurLearnerProfile> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learners.create',
      description: 'Create a learner via the Kangur API.',
      context: {
        endpoint: KANGUR_LEARNERS_ENDPOINT,
        method: 'POST',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnersApiClient.createLearner(input);
      const parsed = kangurLearnerProfileSchema.safeParse(payload);
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
    },
    {
      fallback: createKangurClientFallback('learners.create'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('learners.create', error, {
          endpoint: KANGUR_LEARNERS_ENDPOINT,
          method: 'POST',
        });
      },
    }
  );
};

export const updateLearnerViaApi = async (
  id: string,
  input: KangurLearnerUpdateInput
): Promise<KangurLearnerProfile> => {
  const endpoint = `${KANGUR_LEARNERS_ENDPOINT}/${encodeURIComponent(id)}`;
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learners.update',
      description: 'Update a learner via the Kangur API.',
      context: {
        endpoint,
        method: 'PATCH',
        learnerId: id,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnersApiClient.updateLearner(id, input);
      const parsed = kangurLearnerProfileSchema.safeParse(payload);
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
    },
    {
      fallback: createKangurClientFallback('learners.update'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('learners.update', error, {
          endpoint,
          method: 'PATCH',
          learnerId: id,
        });
      },
    }
  );
};

export const deleteLearnerViaApi = async (id: string): Promise<KangurLearnerProfile> => {
  const endpoint = `${KANGUR_LEARNERS_ENDPOINT}/${encodeURIComponent(id)}`;
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learners.delete',
      description: 'Delete a learner via the Kangur API.',
      context: {
        endpoint,
        method: 'DELETE',
        learnerId: id,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnersApiClient.deleteLearner(id);
      const parsed = kangurLearnerProfileSchema.safeParse(payload);
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
    },
    {
      fallback: createKangurClientFallback('learners.delete'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('learners.delete', error, {
          endpoint,
          method: 'DELETE',
          learnerId: id,
        });
      },
    }
  );
};

export const selectLearner = async (learnerId: string): Promise<KangurUser> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learners.select',
      description: 'Select the active learner and refresh session state.',
      context: {
        learnerId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
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
    },
    {
      fallback: createKangurClientFallback('learners.select'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('learners.select', error, {
          learnerId,
        });
      },
    }
  );
};

const buildLearnerSessionsUrl = (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): string => buildKangurLearnerSessionsPath(learnerId, options);

export const requestLearnerSessions = async (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): Promise<KangurLearnerSessionHistory> => {
  const endpoint = buildLearnerSessionsUrl(learnerId, options);

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learnerSessions.list',
      description: 'Fetch learner session history from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        learnerId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnersApiClient.listLearnerSessions(learnerId, options);
      const parsed = kangurLearnerSessionHistorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur learner sessions payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('learnerSessions.list'),
      shouldReport: (error) =>
        !isKangurAuthStatusError(error) && !isRecoverableKangurClientFetchError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (
          isKangurAuthStatusError(error) ||
          isRecoverableKangurClientFetchError(error)
        ) {
          return;
        }
        trackReadFailure('learnerSessions.list', error, {
          endpoint,
          method: 'GET',
          learnerId,
        });
      },
    }
  );
};

const buildLearnerInteractionsUrl = (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): string => buildKangurLearnerInteractionsPath(learnerId, options);

export const requestLearnerInteractions = async (
  learnerId: string,
  options?: { limit?: number; offset?: number }
): Promise<KangurLearnerInteractionHistory> => {
  const endpoint = buildLearnerInteractionsUrl(learnerId, options);

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learnerInteractions.list',
      description: 'Fetch learner interactions history from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        learnerId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnersApiClient.listLearnerInteractions(learnerId, options);
      const parsed = kangurLearnerInteractionHistorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur learner interactions payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('learnerInteractions.list'),
      shouldReport: (error) =>
        !isKangurAuthStatusError(error) && !isRecoverableKangurClientFetchError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (
          isKangurAuthStatusError(error) ||
          isRecoverableKangurClientFetchError(error)
        ) {
          return;
        }
        trackReadFailure('learnerInteractions.list', error, {
          endpoint,
          method: 'GET',
          learnerId,
        });
      },
    }
  );
};
