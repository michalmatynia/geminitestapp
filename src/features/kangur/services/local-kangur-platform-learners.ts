import type {
  KangurLearnerCreateInput,
  KangurLearnerProfile,
  KangurLearnerUpdateInput,
  KangurLearnerSessionHistory,
  KangurLearnerInteractionHistory,
  KangurUser,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurLearnerProfileSchema,
  kangurLearnerSessionHistorySchema,
  kangurLearnerInteractionHistorySchema,
} from '@/features/kangur/shared/contracts/kangur';
import {
  reportKangurClientError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';

import {
  KANGUR_LEARNERS_ENDPOINT,
  KANGUR_LEARNER_INTERACTIONS_ENDPOINT,
  KANGUR_LEARNER_SESSIONS_ENDPOINT,
} from './local-kangur-platform-endpoints';
import { clearSessionUserCache, resolveSessionUser } from './local-kangur-platform-auth';
import { clearScoreQueryCache } from './local-kangur-platform-score-cache';
import {
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const looksLikeHtml = (value: string): boolean => /<!doctype|<html|<head|<body/i.test(value);

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
              reportKangurClientError(error, {
                source: 'kangur.local-platform',
                action: 'learners.create',
                description: 'Parse learner create error payload.',
                context: {
                  endpoint: KANGUR_LEARNERS_ENDPOINT,
                },
              });
              if (!looksLikeHtml(responseText)) {
                errorMessage = responseText.trim().slice(0, 240);
              }
            }
          }
        } catch (error) {
          reportKangurClientError(error, {
            source: 'kangur.local-platform',
            action: 'learners.create',
            description: 'Read learner create error response body.',
            context: {
              endpoint: KANGUR_LEARNERS_ENDPOINT,
            },
          });

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
      fallback: null as unknown as KangurLearnerProfile,
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
      fallback: null as unknown as KangurLearnerProfile,
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
      fallback: null as unknown as KangurLearnerProfile,
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
      fallback: null as unknown as KangurUser,
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
      const parsed = kangurLearnerSessionHistorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur learner sessions payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: null as unknown as KangurLearnerSessionHistory,
      shouldReport: (error) => !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
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
      const parsed = kangurLearnerInteractionHistorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur learner interactions payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: null as unknown as KangurLearnerInteractionHistory,
      shouldReport: (error) => !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
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
