import type {
  KangurDuelAnswerInput,
  KangurDuelCreateInput,
  KangurDuelHeartbeatInput,
  KangurDuelJoinInput,
  KangurDuelLeaderboardResponse,
  KangurDuelLobbyResponse,
  KangurDuelLobbyPresenceResponse,
  KangurDuelLobbyChatCreateInput,
  KangurDuelLobbyChatListResponse,
  KangurDuelLobbyChatSendResponse,
  KangurDuelOpponentsResponse,
  KangurDuelReactionInput,
  KangurDuelReactionResponse,
  KangurDuelSearchResponse,
  KangurDuelLeaveInput,
  KangurDuelSpectatorStateResponse,
  KangurDuelStateResponse,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurDuelLobbyResponseSchema,
  kangurDuelOpponentsResponseSchema,
  kangurDuelLeaderboardResponseSchema,
  kangurDuelLobbyPresenceResponseSchema,
  kangurDuelReactionResponseSchema,
  kangurDuelSearchResponseSchema,
  kangurDuelSpectatorStateResponseSchema,
  kangurDuelStateResponseSchema,
} from '@/features/kangur/shared/contracts/kangur-duels';
import {
  kangurDuelLobbyChatListResponseSchema,
  kangurDuelLobbyChatSendResponseSchema,
} from '@/shared/contracts/kangur-duels-chat';
import { reportKangurClientError, withKangurClientError } from '@/features/kangur/observability/client';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import {
  KANGUR_DUELS_ANSWER_ENDPOINT,
  KANGUR_DUELS_CREATE_ENDPOINT,
  KANGUR_DUELS_HEARTBEAT_ENDPOINT,
  KANGUR_DUELS_JOIN_ENDPOINT,
  KANGUR_DUELS_LEAVE_ENDPOINT,
  KANGUR_DUELS_LEADERBOARD_ENDPOINT,
  KANGUR_DUELS_LOBBY_ENDPOINT,
  KANGUR_DUELS_LOBBY_PRESENCE_ENDPOINT,
  KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
  KANGUR_DUELS_OPPONENTS_ENDPOINT,
  KANGUR_DUELS_REACTION_ENDPOINT,
  KANGUR_DUELS_SEARCH_ENDPOINT,
  KANGUR_DUELS_SPECTATE_ENDPOINT,
  KANGUR_DUELS_STATE_ENDPOINT,
} from './local-kangur-platform-endpoints';
import {
  createKangurClientFallback,
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

const looksLikeHtml = (value: string): boolean => /<!doctype|<html|<head|<body/i.test(value);

export const requestDuelStateFromApi = async (
  sessionId: string,
  options?: { signal?: AbortSignal }
): Promise<KangurDuelStateResponse> => {
  const endpoint = `${KANGUR_DUELS_STATE_ENDPOINT}?sessionId=${encodeURIComponent(sessionId)}`;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.state',
      description: 'Fetch duel state from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        sessionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel state request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel state payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.state'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.state', error, {
          endpoint,
          method: 'GET',
          sessionId,
        });
      },
    }
  );
};

export const requestDuelSpectatorStateFromApi = async (
  sessionId: string,
  options?: { spectatorId?: string; signal?: AbortSignal }
): Promise<KangurDuelSpectatorStateResponse> => {
  const params = new URLSearchParams({ sessionId });
  if (options?.spectatorId) {
    params.set('spectatorId', options.spectatorId);
  }
  const endpoint = `${KANGUR_DUELS_SPECTATE_ENDPOINT}?${params.toString()}`;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.spectate',
      description: 'Fetch duel spectate state from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        sessionId,
        spectatorId: options?.spectatorId ?? null,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel spectate request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelSpectatorStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel spectate payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.spectate'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.spectate', error, {
          endpoint,
          method: 'GET',
          sessionId,
        });
      },
    }
  );
};

export const requestDuelLobbyFromApi = async (
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelLobbyResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const endpoint = limit
    ? `${KANGUR_DUELS_LOBBY_ENDPOINT}?limit=${encodeURIComponent(limit)}`
    : KANGUR_DUELS_LOBBY_ENDPOINT;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.lobby',
      description: 'Fetch duel lobby state from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        limit,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel lobby request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelLobbyResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel lobby payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.lobby'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.lobby', error, {
          endpoint,
          method: 'GET',
        });
      },
    }
  );
};

export const requestDuelLobbyPresenceFromApi = async (
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelLobbyPresenceResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const endpoint = limit
    ? `${KANGUR_DUELS_LOBBY_PRESENCE_ENDPOINT}?limit=${encodeURIComponent(limit)}`
    : KANGUR_DUELS_LOBBY_PRESENCE_ENDPOINT;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.lobby_presence',
      description: 'Fetch duel lobby presence from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        limit,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel lobby presence request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelLobbyPresenceResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel lobby presence payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.lobby_presence'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.lobby_presence', error, {
          endpoint,
          method: 'GET',
        });
      },
    }
  );
};

export const pingDuelLobbyPresenceViaApi = async (
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelLobbyPresenceResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const endpoint = limit
    ? `${KANGUR_DUELS_LOBBY_PRESENCE_ENDPOINT}?limit=${encodeURIComponent(limit)}`
    : KANGUR_DUELS_LOBBY_PRESENCE_ENDPOINT;

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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel lobby presence ping failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
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

export const requestDuelLeaderboardFromApi = async (
  options?: { limit?: number; lookbackDays?: number; signal?: AbortSignal }
): Promise<KangurDuelLeaderboardResponse> => {
  const params = new URLSearchParams();
  if (typeof options?.limit === 'number' && Number.isFinite(options.limit)) {
    params.set('limit', String(Math.max(1, Math.floor(options.limit))));
  }
  if (typeof options?.lookbackDays === 'number' && Number.isFinite(options.lookbackDays)) {
    params.set('lookbackDays', String(Math.max(1, Math.floor(options.lookbackDays))));
  }
  const endpoint = params.size
    ? `${KANGUR_DUELS_LEADERBOARD_ENDPOINT}?${params.toString()}`
    : KANGUR_DUELS_LEADERBOARD_ENDPOINT;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.leaderboard',
      description: 'Fetch duel leaderboard from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel leaderboard request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelLeaderboardResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel leaderboard payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.leaderboard'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.leaderboard', error, {
          endpoint,
          method: 'GET',
        });
      },
    }
  );
};

export const requestDuelLobbyChatFromApi = async (
  options?: { limit?: number; before?: string | null; signal?: AbortSignal }
): Promise<KangurDuelLobbyChatListResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const before =
    typeof options?.before === 'string' && options.before.trim().length > 0
      ? options.before.trim()
      : null;
  const query = new URLSearchParams();
  if (limit) {
    query.set('limit', String(limit));
  }
  if (before) {
    query.set('before', before);
  }
  const endpoint = query.size > 0
    ? `${KANGUR_DUELS_LOBBY_CHAT_ENDPOINT}?${query.toString()}`
    : KANGUR_DUELS_LOBBY_CHAT_ENDPOINT;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.lobby_chat',
      description: 'Fetch duel lobby chat messages from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        limit,
        before,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel lobby chat request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelLobbyChatListResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel lobby chat payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.lobby_chat'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.lobby_chat', error, {
          endpoint,
          method: 'GET',
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
        endpoint: KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
        method: 'POST',
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_LOBBY_CHAT_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        let errorMessage = `Kangur duel lobby chat send failed with ${response.status}`;
        const errorId = response.headers.get('x-error-id');

        try {
          const responseText = await response.text();
          if (responseText.trim().length > 0) {
            try {
              const payload = JSON.parse(responseText) as Record<string, unknown>;
              if (typeof payload['error'] === 'string') {
                errorMessage = payload['error'];
              } else if (typeof payload['message'] === 'string') {
                errorMessage = payload['message'];
              } else if (!looksLikeHtml(responseText)) {
                errorMessage = responseText.trim().slice(0, 240);
              }
            } catch (error) {
              void ErrorSystem.captureException(error);
              reportKangurClientError(error, {
                source: 'kangur.local-platform',
                action: 'duels.lobby_chat_send',
                description: 'Parse duel lobby chat error payload.',
                context: {
                  endpoint: KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
                },
              });
              if (!looksLikeHtml(responseText)) {
                errorMessage = responseText.trim().slice(0, 240);
              }
            }
          }
        } catch (error) {
          void ErrorSystem.captureException(error);
          reportKangurClientError(error, {
            source: 'kangur.local-platform',
            action: 'duels.lobby_chat_send',
            description: 'Read duel lobby chat error response body.',
            context: {
              endpoint: KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
            },
          });
        }

        const requestError = new Error(errorMessage) as Error & {
          status: number;
          errorId?: string;
        };
        requestError.status = response.status;
        if (errorId) {
          requestError.errorId = errorId;
        }
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelLobbyChatSendResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel lobby chat send payload validation failed.');
      }

      trackWriteSuccess('duels.lobby_chat_send', {
        endpoint: KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
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
          endpoint: KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
          method: 'POST',
        });
      },
    }
  );
};

export const requestDuelOpponentsFromApi = async (
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelOpponentsResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const endpoint = limit
    ? `${KANGUR_DUELS_OPPONENTS_ENDPOINT}?limit=${encodeURIComponent(limit)}`
    : KANGUR_DUELS_OPPONENTS_ENDPOINT;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.opponents',
      description: 'Fetch recent duel opponents from the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        limit,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel opponents request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelOpponentsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel opponents payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.opponents'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.opponents', error, {
          endpoint,
          method: 'GET',
        });
      },
    }
  );
};

export const requestDuelSearchFromApi = async (
  query: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelSearchResponse> => {
  const trimmed = query.trim();
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const searchParams = new URLSearchParams();
  searchParams.set('q', trimmed);
  if (limit) {
    searchParams.set('limit', String(limit));
  }
  const endpoint = `${KANGUR_DUELS_SEARCH_ENDPOINT}?${searchParams.toString()}`;

  return withKangurClientError(
    (error) => ({
      source: 'kangur.local-platform',
      action: 'duels.search',
      description: 'Search for duel opponents via the Kangur API.',
      context: {
        endpoint,
        method: 'GET',
        query: trimmed,
        limit,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: createActorAwareHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel search request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelSearchResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel search payload validation failed.');
      }

      return parsed.data;
    },
    {
      fallback: createKangurClientFallback('duels.search'),
      shouldReport: (error) =>
        !isAbortLikeError(error, options?.signal) && !isKangurAuthStatusError(error),
      shouldRethrow: () => true,
      onError: (error) => {
        if (isAbortLikeError(error, options?.signal) || isKangurAuthStatusError(error)) {
          return;
        }
        trackReadFailure('duels.search', error, {
          endpoint,
          method: 'GET',
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
        endpoint: KANGUR_DUELS_CREATE_ENDPOINT,
        method: 'POST',
        mode: input.mode,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_CREATE_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel create request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel create payload validation failed.');
      }

      trackWriteSuccess('duels.create', {
        endpoint: KANGUR_DUELS_CREATE_ENDPOINT,
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
          endpoint: KANGUR_DUELS_CREATE_ENDPOINT,
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
        endpoint: KANGUR_DUELS_JOIN_ENDPOINT,
        method: 'POST',
        sessionId: input.sessionId ?? null,
        mode: input.mode ?? null,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_JOIN_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel join request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel join payload validation failed.');
      }

      trackWriteSuccess('duels.join', {
        endpoint: KANGUR_DUELS_JOIN_ENDPOINT,
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
          endpoint: KANGUR_DUELS_JOIN_ENDPOINT,
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
        endpoint: KANGUR_DUELS_HEARTBEAT_ENDPOINT,
        method: 'POST',
        sessionId: input.sessionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_HEARTBEAT_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
        signal: options?.signal,
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel heartbeat request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
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
        endpoint: KANGUR_DUELS_ANSWER_ENDPOINT,
        method: 'POST',
        sessionId: input.sessionId,
        questionId: input.questionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_ANSWER_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel answer request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel answer payload validation failed.');
      }

      trackWriteSuccess('duels.answer', {
        endpoint: KANGUR_DUELS_ANSWER_ENDPOINT,
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
          endpoint: KANGUR_DUELS_ANSWER_ENDPOINT,
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
        endpoint: KANGUR_DUELS_REACTION_ENDPOINT,
        method: 'POST',
        sessionId: input.sessionId,
        type: input.type,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_REACTION_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel reaction request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelReactionResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel reaction payload validation failed.');
      }

      trackWriteSuccess('duels.reaction', {
        endpoint: KANGUR_DUELS_REACTION_ENDPOINT,
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
          endpoint: KANGUR_DUELS_REACTION_ENDPOINT,
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
        endpoint: KANGUR_DUELS_LEAVE_ENDPOINT,
        method: 'POST',
        sessionId: input.sessionId,
        ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
      },
    }),
    async () => {
      const response = await fetch(KANGUR_DUELS_LEAVE_ENDPOINT, {
        method: 'POST',
        headers: createActorAwareHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const requestError = new Error(
          `Kangur duel leave request failed with ${response.status}`
        ) as Error & { status: number };
        requestError.status = response.status;
        throw requestError;
      }

      const payload = (await response.json()) as unknown;
      const parsed = kangurDuelStateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error('Kangur duel leave payload validation failed.');
      }

      trackWriteSuccess('duels.leave', {
        endpoint: KANGUR_DUELS_LEAVE_ENDPOINT,
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
          endpoint: KANGUR_DUELS_LEAVE_ENDPOINT,
          method: 'POST',
          sessionId: input.sessionId,
        });
      },
    }
  );
};
