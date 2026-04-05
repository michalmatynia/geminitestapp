import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import {
  buildKangurProgressPath,
  createKangurApiClient,
} from '@kangur/api-client';
import {
  createGuestKangurScore,
  resetGuestKangurScoreSession,
} from '@/features/kangur/services/guest-kangur-scores';
import { clearStoredActiveLearnerId } from '@/features/kangur/services/kangur-active-learner';
import { saveProgressOwnerKey } from '@/features/kangur/ui/services/progress';
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
  KangurProgressRequestOptions,
  KangurProgressUpdateContext,
  KangurScoreCreateInput,
  KangurScoreRecord,
} from '@kangur/platform';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import { kangurLearnerActivitySnapshotSchema, kangurLearnerActivityStatusSchema, kangurProgressStateSchema } from '@kangur/contracts/kangur';
import { type KangurProgressState } from '@kangur/contracts/kangur';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import {
  createAssignmentViaApi,
  reassignAssignmentViaApi,
  requestAssignmentsFromApi,
  updateAssignmentViaApi,
} from './local-kangur-platform-assignments';
import {
  clearSessionUserCache,
  prepareLoginHref,
  requestKangurLogout,
  resolveSessionUser,
} from './local-kangur-platform-auth';
import {
  createDuelViaApi,
  heartbeatDuelViaApi,
  joinDuelViaApi,
  leaveDuelViaApi,
  requestDuelLeaderboardFromApi,
  requestDuelLobbyFromApi,
  requestDuelLobbyPresenceFromApi,
  requestDuelLobbyChatFromApi,
  requestDuelOpponentsFromApi,
  requestDuelSearchFromApi,
  requestDuelSpectatorStateFromApi,
  requestDuelStateFromApi,
  pingDuelLobbyPresenceViaApi,
  sendDuelReactionViaApi,
  sendDuelLobbyChatMessageViaApi,
  submitDuelAnswerViaApi,
} from './local-kangur-platform-duels';
import {
  KANGUR_LEARNER_ACTIVITY_ENDPOINT,
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
  createKangurClientFallback,
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const progressResponseSchema = kangurProgressStateSchema;
const learnerActivityStatusSchema = kangurLearnerActivityStatusSchema;

const kangurProgressApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});
const kangurLearnerActivityApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

const buildProgressEndpoint = (subject?: KangurProgressRequestOptions['subject']): string => {
  return withKangurClientErrorSync(
    {
      source: 'kangur.local-platform',
      action: 'progress.endpoint',
      description: 'Build the progress endpoint URL with the requested subject.',
      context: {
        subject,
      },
    },
    () => buildKangurProgressPath(subject ? { subject } : undefined),
    {
      fallback: subject
        ? `${KANGUR_PROGRESS_ENDPOINT}?subject=${encodeURIComponent(subject)}`
        : KANGUR_PROGRESS_ENDPOINT,
    }
  );
};

const requestProgressFromApi = async (
  options?: KangurProgressRequestOptions
): Promise<KangurProgressState> => {
  const endpoint = buildProgressEndpoint(options?.subject);

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'progress.get',
      description: 'Fetch learner progress from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        subject: options?.subject ?? null,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurProgressApiClient.getProgress(
        options?.subject ? { subject: options.subject } : undefined
      );
      const parsed = progressResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur progress payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('progress.get'),
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
        trackReadFailure('progress.get', error, {
          endpoint,
          method: 'GET',
        });
      },
    }
  );
};

const updateProgressViaApi = async (
  input: KangurProgressState,
  context?: KangurProgressUpdateContext & KangurProgressRequestOptions
): Promise<KangurProgressState> => {
  const endpoint = buildProgressEndpoint(context?.subject);

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'progress.update',
      description: 'Persist progress updates to the Kangur API.',
      context: {
        endpoint,
        method: 'PATCH',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const progressHeaders: Record<string, string> = {};
      if (context?.source === KANGUR_PROGRESS_CTA_SOURCE) {
        progressHeaders[KANGUR_PROGRESS_SOURCE_HEADER] = context.source;
      }
      if (context?.cta?.trim()) {
        progressHeaders[KANGUR_PROGRESS_CTA_HEADER] = context.cta.trim();
      }

      const payload = await kangurProgressApiClient.updateProgress(
        input,
        context?.subject ? { subject: context.subject } : undefined,
        {
          headers: progressHeaders,
        }
      );
      const parsed = progressResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur progress update payload validation failed.');
      }

      trackWriteSuccess('progress.update', {
        endpoint,
        method: 'PATCH',
        totalXp: parsed.data.totalXp,
        gamesPlayed: parsed.data.gamesPlayed,
        lessonsCompleted: parsed.data.lessonsCompleted,
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('progress.update'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('progress.update', error, {
          endpoint,
          method: 'PATCH',
          totalXp: input.totalXp,
          gamesPlayed: input.gamesPlayed,
        });
      },
    }
  );
};

const requestLearnerActivityStatus = async (): Promise<KangurLearnerActivityStatus> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learnerActivity.get',
      description: 'Fetch learner activity status from the Kangur API.',
      context: {
        endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
        method: 'GET',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnerActivityApiClient.getLearnerActivity({
        cache: 'no-store',
      });
      const parsed = learnerActivityStatusSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur learner activity payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('learnerActivity.get'),
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
        trackReadFailure('learnerActivity.get', error, {
          endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
          method: 'GET',
        });
      },
    }
  );
};

const updateLearnerActivityViaApi = async (
  input: KangurLearnerActivityUpdateInput
): Promise<KangurLearnerActivitySnapshot> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'learnerActivity.update',
      description: 'Persist learner activity updates to the Kangur API.',
      context: {
        endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
        method: 'POST',
        kind: input.kind,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurLearnerActivityApiClient.updateLearnerActivity(input);
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
    },
    {
      fallback: createKangurClientFallback('learnerActivity.update'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('learnerActivity.update', error, {
          endpoint: KANGUR_LEARNER_ACTIVITY_ENDPOINT,
          method: 'POST',
          kind: input.kind,
        });
      },
    }
  );
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
        saveProgressOwnerKey(null);
        resetGuestKangurScoreSession();
        await requestKangurLogout({
          headers: withCsrfHeaders(),
        }).catch((error) => {
          void ErrorSystem.captureException(error);
        });
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
      create: async (input: KangurScoreCreateInput) =>
        withKangurClientError(
          (error) => ({
            source: 'kangur.local-platform',
            action: 'score.create',
            description: 'Persist a score for the active learner or guest session.',
            context: {
              operation: input.operation,
              ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
            },
          }),
          async () => {
            await resolveSessionUser();
            return createScoreViaApi(input);
          },
          {
            fallback: () => createGuestKangurScore(input),
            shouldReport: (error) => !isKangurAuthStatusError(error),
            shouldRethrow: (error) => !isKangurAuthStatusError(error),
          }
        ),
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
          subject: criteria.subject,
          created_by: criteria.created_by ?? undefined,
          learner_id: typeof criteria.learner_id === 'string' ? criteria.learner_id : undefined,
        }),
    },
    progress: {
      get: async (options?: KangurProgressRequestOptions) => requestProgressFromApi(options),
      update: async (
        input: KangurProgressState,
        context?: KangurProgressUpdateContext & KangurProgressRequestOptions
      ) => updateProgressViaApi(input, context),
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
      heartbeat: async (input, options) => heartbeatDuelViaApi(input, options),
      lobby: async (options) => requestDuelLobbyFromApi(options),
      lobbyPresence: async (options) => requestDuelLobbyPresenceFromApi(options),
      lobbyPresencePing: async (options) => pingDuelLobbyPresenceViaApi(options),
      recentOpponents: async (options) => requestDuelOpponentsFromApi(options),
      search: async (query, options) => requestDuelSearchFromApi(query, options),
      leaderboard: async (options) => requestDuelLeaderboardFromApi(options),
      answer: async (input) => submitDuelAnswerViaApi(input),
      leave: async (input) => leaveDuelViaApi(input),
      reaction: async (input) => sendDuelReactionViaApi(input),
      spectate: async (sessionId, options) => requestDuelSpectatorStateFromApi(sessionId, options),
    },
    lobbyChat: {
      list: async (options) => requestDuelLobbyChatFromApi(options),
      send: async (input) => sendDuelLobbyChatMessageViaApi(input),
    },
  };
};
