import type {
  KangurDuelLeaderboardResponse,
  KangurDuelLobbyResponse,
  KangurDuelLobbyPresenceResponse,
  KangurDuelLobbyChatListResponse,
  KangurDuelOpponentsResponse,
  KangurDuelSearchResponse,
  KangurDuelSpectatorStateResponse,
  KangurDuelStateResponse,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurDuelLeaderboardResponseSchema,
  kangurDuelLobbyPresenceResponseSchema,
  kangurDuelLobbyResponseSchema,
  kangurDuelOpponentsResponseSchema,
  kangurDuelSearchResponseSchema,
  kangurDuelSpectatorStateResponseSchema,
  kangurDuelStateResponseSchema,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { kangurDuelLobbyChatListResponseSchema } from '@/shared/contracts/kangur-duels-chat';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';

import {
  KANGUR_DUELS_LEADERBOARD_ENDPOINT,
  KANGUR_DUELS_LOBBY_CHAT_ENDPOINT,
  KANGUR_DUELS_LOBBY_ENDPOINT,
  KANGUR_DUELS_LOBBY_PRESENCE_ENDPOINT,
  KANGUR_DUELS_OPPONENTS_ENDPOINT,
  KANGUR_DUELS_SEARCH_ENDPOINT,
  KANGUR_DUELS_SPECTATE_ENDPOINT,
  KANGUR_DUELS_STATE_ENDPOINT,
} from './local-kangur-platform-endpoints';
import {
  createActorAwareHeaders,
  createKangurClientFallback,
  trackReadFailure,
} from './local-kangur-platform-shared';

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
