import { logKangurClientError } from '@/features/kangur/observability/client';
import {
  createGuestKangurScore,
  resetGuestKangurScoreSession,
} from '@/features/kangur/services/guest-kangur-scores';
import { clearStoredActiveLearnerId } from '@/features/kangur/services/kangur-active-learner';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentUpdateInput,
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
  KangurLearnerCreateInput,
  KangurLearnerUpdateInput,
  KangurPlatform,
  KangurProgressUpdateContext,
  KangurScoreCreateInput,
  KangurScoreRecord,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurLearnerActivitySnapshotSchema,
  kangurLearnerActivityStatusSchema,
  kangurProgressStateSchema,
  type KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import {
  createAssignmentViaApi,
  reassignAssignmentViaApi,
  requestAssignmentsFromApi,
  updateAssignmentViaApi,
} from './local-kangur-platform-assignments';
import {
  clearSessionUserCache,
  prepareLoginHref,
  resolveSessionUser,
} from './local-kangur-platform-auth';
import {
  createDuelViaApi,
  joinDuelViaApi,
  leaveDuelViaApi,
  requestDuelLobbyFromApi,
  requestDuelOpponentsFromApi,
  requestDuelSearchFromApi,
  requestDuelStateFromApi,
  submitDuelAnswerViaApi,
} from './local-kangur-platform-duels';
import {
  KANGUR_LEARNER_ACTIVITY_ENDPOINT,
  KANGUR_LOGOUT_ENDPOINT,
  KANGUR_PROGRESS_CTA_HEADER,
  KANGUR_PROGRESS_CTA_SOURCE,
  KANGUR_PROGRESS_ENDPOINT,
  KANGUR_PROGRESS_SOURCE_HEADER,
} from './local-kangur-platform-endpoints';
import {
  createLearnerViaApi,
  deleteLearnerViaApi,
  requestLearnerInteractions,
  requestLearnerSessions,
  selectLearner,
  updateLearnerViaApi,
} from './local-kangur-platform-learners';
import { clearScoreQueryCache } from './local-kangur-platform-score-cache';
import { createScoreViaApi, requestMergedScores } from './local-kangur-platform-scores';
import {
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const progressResponseSchema = kangurProgressStateSchema;
const learnerActivityStatusSchema = kangurLearnerActivityStatusSchema;

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
          limit,
        }),
      filter: async (criteria: Partial<KangurScoreRecord>, sort?: string, limit?: number) =>
        requestMergedScores({
          sort,
          limit,
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
    duels: {
      create: async (input) => createDuelViaApi(input),
      join: async (input) => joinDuelViaApi(input),
      state: async (sessionId, options) => requestDuelStateFromApi(sessionId, options),
      lobby: async (options) => requestDuelLobbyFromApi(options),
      recentOpponents: async (options) => requestDuelOpponentsFromApi(options),
      search: async (query, options) => requestDuelSearchFromApi(query, options),
      answer: async (input) => submitDuelAnswerViaApi(input),
      leave: async (input) => leaveDuelViaApi(input),
    },
  };
};
