import {
  buildKangurDuelLeaderboardPath,
  buildKangurDuelLobbyChatPath,
  buildKangurDuelLobbyPath,
  buildKangurDuelLobbyPresencePath,
  buildKangurDuelOpponentsPath,
  buildKangurDuelSearchPath,
  buildKangurDuelSpectatePath,
  buildKangurDuelStatePath,
  createKangurApiClient,
} from '@kangur/api-client';
import type {
  KangurDuelLeaderboardResponse,
  KangurDuelLobbyResponse,
  KangurDuelLobbyPresenceResponse,
  KangurDuelLobbyChatListResponse,
  KangurDuelOpponentsResponse,
  KangurDuelSearchResponse,
  KangurDuelSpectatorStateResponse,
  KangurDuelStateResponse,
} from '@kangur/platform';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurDuelLeaderboardResponseSchema,
  kangurDuelLobbyPresenceResponseSchema,
  kangurDuelLobbyResponseSchema,
  kangurDuelOpponentsResponseSchema,
  kangurDuelSearchResponseSchema,
  kangurDuelSpectatorStateResponseSchema,
  kangurDuelStateResponseSchema,
  kangurDuelLobbyChatListResponseSchema,
} from '@kangur/contracts';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';

import {
  createActorAwareHeaders,
  createKangurClientFallback,
  trackReadFailure,
} from './local-kangur-platform-shared';

const kangurDuelsApiClient = createKangurApiClient({
  fetchImpl: fetch,
  credentials: 'same-origin',
  getHeaders: () => createActorAwareHeaders(),
});

export const requestDuelStateFromApi = async (
  sessionId: string,
  options?: { signal?: AbortSignal }
): Promise<KangurDuelStateResponse> => {
  const endpoint = buildKangurDuelStatePath(sessionId);

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
      const payload = await kangurDuelsApiClient.getDuelState(sessionId, {
        cache: 'no-store',
        signal: options?.signal,
      });
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
  const endpoint = buildKangurDuelSpectatePath(sessionId, {
    spectatorId: options?.spectatorId,
  });

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
      const payload = await kangurDuelsApiClient.getDuelSpectatorState(
        sessionId,
        { spectatorId: options?.spectatorId },
        {
          cache: 'no-store',
          signal: options?.signal,
        }
      );
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
  const endpoint = buildKangurDuelLobbyPath(limit ? { limit } : undefined);

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
      const payload = await kangurDuelsApiClient.listDuelLobby(limit ? { limit } : undefined, {
        cache: 'no-store',
        signal: options?.signal,
      });
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
  const endpoint = buildKangurDuelLobbyPresencePath(limit ? { limit } : undefined);

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
      const payload = await kangurDuelsApiClient.listDuelLobbyPresence(
        limit ? { limit } : undefined,
        {
          cache: 'no-store',
          signal: options?.signal,
        }
      );
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

export const requestDuelLeaderboardFromApi = async (
  options?: { limit?: number; lookbackDays?: number; signal?: AbortSignal }
): Promise<KangurDuelLeaderboardResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : undefined;
  const lookbackDays =
    typeof options?.lookbackDays === 'number' && Number.isFinite(options.lookbackDays)
      ? Math.max(1, Math.floor(options.lookbackDays))
      : undefined;
  const endpoint = buildKangurDuelLeaderboardPath({ limit, lookbackDays });

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
      const payload = await kangurDuelsApiClient.getDuelLeaderboard(
        { limit, lookbackDays },
        {
          cache: 'no-store',
          signal: options?.signal,
        }
      );
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
  const requestQuery = {
    ...(limit ? { limit } : {}),
    ...(before ? { before } : {}),
  };
  const endpoint = buildKangurDuelLobbyChatPath(requestQuery);

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
      const payload = await kangurDuelsApiClient.listDuelLobbyChat(requestQuery, {
        cache: 'no-store',
        signal: options?.signal,
      });
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

export const requestDuelOpponentsFromApi = async (
  options?: { limit?: number; signal?: AbortSignal }
): Promise<KangurDuelOpponentsResponse> => {
  const limit = typeof options?.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit))
    : null;
  const endpoint = buildKangurDuelOpponentsPath(limit ? { limit } : undefined);

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
      const payload = await kangurDuelsApiClient.listDuelOpponents(
        limit ? { limit } : undefined,
        {
          cache: 'no-store',
          signal: options?.signal,
        }
      );
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
  const endpoint = buildKangurDuelSearchPath(trimmed, limit ? { limit } : undefined);

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
      const payload = await kangurDuelsApiClient.searchDuels(
        trimmed,
        limit ? { limit } : undefined,
        {
          cache: 'no-store',
          signal: options?.signal,
        }
      );
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
