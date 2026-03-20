import {
  buildKangurDuelLobbyPresencePath,
  createKangurApiClient,
  KANGUR_DUELS_ANSWER_PATH,
  KANGUR_DUELS_CREATE_PATH,
  KANGUR_DUELS_HEARTBEAT_PATH,
  KANGUR_DUELS_JOIN_PATH,
  KANGUR_DUELS_LEAVE_PATH,
  KANGUR_DUELS_LOBBY_CHAT_PATH,
  KANGUR_DUELS_REACTION_PATH,
} from '@kangur/api-client';
import type {
  KangurDuelAnswerInput,
  KangurDuelCreateInput,
  KangurDuelHeartbeatInput,
  KangurDuelJoinInput,
  KangurDuelLobbyChatCreateInput,
  KangurDuelLobbyChatSendResponse,
  KangurDuelLobbyPresenceResponse,
  KangurDuelLeaveInput,
  KangurDuelReactionInput,
  KangurDuelReactionResponse,
  KangurDuelStateResponse,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurDuelLobbyChatSendResponseSchema,
  kangurDuelLobbyPresenceResponseSchema,
  kangurDuelReactionResponseSchema,
  kangurDuelStateResponseSchema,
} from '@kangur/contracts';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import {
  createActorAwareHeaders,
  createKangurClientFallback,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const kangurDuelsApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

export const pingDuelLobbyPresenceViaApi = async (
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelLobbyPresenceResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const endpoint = buildKangurDuelLobbyPresencePath(limit ? { limit } : undefined);

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.lobby_presence_ping',
      description: 'Ping duel lobby presence via the Kangur API.',
      context: {
        endpoint,
        method: 'POST',
        limit,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.pingDuelLobbyPresence(
        limit ? { limit } : undefined,
        {
        cache: 'no-store',
        signal: options?.signal,
        }
      );
      const parsed = kangurDuelLobbyPresenceResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel lobby presence ping payload validation failed.');
      }

      trackWriteSuccess('duels.lobby_presence_ping', {
        endpoint,
        method: 'POST',
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.lobby_presence_ping'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackWriteFailure('duels.lobby_presence_ping', error, {
          endpoint,
          method: 'POST',
        });
      },
    }
  );
};

export const sendDuelLobbyChatMessageViaApi = async (
  input: KangurDuelLobbyChatCreateInput
): Promise<KangurDuelLobbyChatSendResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.lobby_chat_send',
      description: 'Send a duel lobby chat message via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_LOBBY_CHAT_PATH,
        method: 'POST',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.sendDuelLobbyChatMessage(input);
      const parsed = kangurDuelLobbyChatSendResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel lobby chat send payload validation failed.');
      }

      trackWriteSuccess('duels.lobby_chat_send', {
        endpoint: KANGUR_DUELS_LOBBY_CHAT_PATH,
        method: 'POST',
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.lobby_chat_send'),
      shouldReport: (error) => !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
          return;
        }
        trackWriteFailure('duels.lobby_chat_send', error, {
          endpoint: KANGUR_DUELS_LOBBY_CHAT_PATH,
          method: 'POST',
        });
      },
    }
  );
};

export const createDuelViaApi = async (
  input: KangurDuelCreateInput
): Promise<KangurDuelStateResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.create',
      description: 'Create a new duel session via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_CREATE_PATH,
        method: 'POST',
        mode: input.mode,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.createDuel(input);
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel create payload validation failed.');
      }

      trackWriteSuccess('duels.create', {
        endpoint: KANGUR_DUELS_CREATE_PATH,
        method: 'POST',
        sessionId: parsed.data.session.id,
        mode: parsed.data.session.mode,
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.create'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('duels.create', error, {
          endpoint: KANGUR_DUELS_CREATE_PATH,
          method: 'POST',
          mode: input.mode,
        });
      },
    }
  );
};

export const joinDuelViaApi = async (
  input: KangurDuelJoinInput
): Promise<KangurDuelStateResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.join',
      description: 'Join a duel session via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_JOIN_PATH,
        method: 'POST',
        sessionId: input.sessionId ?? null,
        mode: input.mode ?? null,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.joinDuel(input);
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel join payload validation failed.');
      }

      trackWriteSuccess('duels.join', {
        endpoint: KANGUR_DUELS_JOIN_PATH,
        method: 'POST',
        sessionId: parsed.data.session.id,
        mode: parsed.data.session.mode,
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.join'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('duels.join', error, {
          endpoint: KANGUR_DUELS_JOIN_PATH,
          method: 'POST',
          sessionId: input.sessionId ?? null,
          mode: input.mode ?? null,
        });
      },
    }
  );
};

export const heartbeatDuelViaApi = async (
  input: KangurDuelHeartbeatInput,
  options?: { signal?: AbortSignal }
): Promise<KangurDuelStateResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.heartbeat',
      description: 'Send a duel heartbeat via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_HEARTBEAT_PATH,
        method: 'POST',
        sessionId: input.sessionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.heartbeatDuel(input, {
        signal: options?.signal,
      });
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel heartbeat payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.heartbeat'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
      },
    }
  );
};

export const submitDuelAnswerViaApi = async (
  input: KangurDuelAnswerInput
): Promise<KangurDuelStateResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.answer',
      description: 'Submit a duel answer via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_ANSWER_PATH,
        method: 'POST',
        sessionId: input.sessionId,
        questionId: input.questionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.answerDuel(input);
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel answer payload validation failed.');
      }

      trackWriteSuccess('duels.answer', {
        endpoint: KANGUR_DUELS_ANSWER_PATH,
        method: 'POST',
        sessionId: parsed.data.session.id,
        questionIndex: parsed.data.session.currentQuestionIndex,
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.answer'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('duels.answer', error, {
          endpoint: KANGUR_DUELS_ANSWER_PATH,
          method: 'POST',
          sessionId: input.sessionId,
          questionId: input.questionId,
        });
      },
    }
  );
};

export const sendDuelReactionViaApi = async (
  input: KangurDuelReactionInput
): Promise<KangurDuelReactionResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.reaction',
      description: 'Send a duel reaction via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_REACTION_PATH,
        method: 'POST',
        sessionId: input.sessionId,
        type: input.type,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.reactToDuel(input);
      const parsed = kangurDuelReactionResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel reaction payload validation failed.');
      }

      trackWriteSuccess('duels.reaction', {
        endpoint: KANGUR_DUELS_REACTION_PATH,
        method: 'POST',
        sessionId: input.sessionId,
        type: input.type,
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.reaction'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('duels.reaction', error, {
          endpoint: KANGUR_DUELS_REACTION_PATH,
          method: 'POST',
          sessionId: input.sessionId,
          type: input.type,
        });
      },
    }
  );
};

export const leaveDuelViaApi = async (
  input: KangurDuelLeaveInput
): Promise<KangurDuelStateResponse> => {
  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.leave',
      description: 'Leave a duel session via the Kangur API.',
      context: {
        endpoint: KANGUR_DUELS_LEAVE_PATH,
        method: 'POST',
        sessionId: input.sessionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const payload = await kangurDuelsApiClient.leaveDuel(input);
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel leave payload validation failed.');
      }

      trackWriteSuccess('duels.leave', {
        endpoint: KANGUR_DUELS_LEAVE_PATH,
        method: 'POST',
        sessionId: parsed.data.session.id,
        status: parsed.data.session.status,
      });
      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.leave'),
      shouldRethrow: () => true,
      onError: (error) => {
        trackWriteFailure('duels.leave', error, {
          endpoint: KANGUR_DUELS_LEAVE_PATH,
          method: 'POST',
          sessionId: input.sessionId,
        });
      },
    }
  );
};
