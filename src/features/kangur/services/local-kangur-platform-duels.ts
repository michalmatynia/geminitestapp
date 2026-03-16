import type {
  KangurDuelAnswerInput,
  KangurDuelCreateInput,
  KangurDuelJoinInput,
  KangurDuelLobbyResponse,
  KangurDuelOpponentsResponse,
  KangurDuelSearchResponse,
  KangurDuelLeaveInput,
  KangurDuelStateResponse,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError, isKangurStatusError } from '@/features/kangur/services/status-errors';
import {
  kangurDuelLobbyResponseSchema,
  kangurDuelOpponentsResponseSchema,
  kangurDuelSearchResponseSchema,
  kangurDuelStateResponseSchema,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';

import {
  KANGUR_DUELS_ANSWER_ENDPOINT,
  KANGUR_DUELS_CREATE_ENDPOINT,
  KANGUR_DUELS_JOIN_ENDPOINT,
  KANGUR_DUELS_LEAVE_ENDPOINT,
  KANGUR_DUELS_LOBBY_ENDPOINT,
  KANGUR_DUELS_OPPONENTS_ENDPOINT,
  KANGUR_DUELS_SEARCH_ENDPOINT,
  KANGUR_DUELS_STATE_ENDPOINT,
} from './local-kangur-platform-endpoints';
import {
  createActorAwareHeaders,
  trackReadFailure,
  trackWriteFailure,
  trackWriteSuccess,
} from './local-kangur-platform-shared';

export const requestDuelStateFromApi = async (
  sessionId: string,
  options?: { signal?: AbortSignal }
): Promise<KangurDuelStateResponse> => {
  const endpoint = `${KANGUR_DUELS_STATE_ENDPOINT}?sessionId=${encodeURIComponent(sessionId)}`;

  try {
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
  } catch (error: unknown) {
    if (isAbortLikeError(error, options?.signal)) {
      throw error;
    }
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('duels.state', error, {
      endpoint,
      method: 'GET',
      sessionId,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.state',
      method: 'GET',
      endpoint,
      sessionId,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
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

  try {
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
  } catch (error: unknown) {
    if (isAbortLikeError(error, options?.signal)) {
      throw error;
    }
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('duels.lobby', error, {
      endpoint,
      method: 'GET',
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.lobby',
      method: 'GET',
      endpoint,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
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

  try {
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
  } catch (error: unknown) {
    if (isAbortLikeError(error, options?.signal)) {
      throw error;
    }
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('duels.opponents', error, {
      endpoint,
      method: 'GET',
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.opponents',
      method: 'GET',
      endpoint,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
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

  try {
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
  } catch (error: unknown) {
    if (isAbortLikeError(error, options?.signal)) {
      throw error;
    }
    logClientError(error);
    if (isKangurAuthStatusError(error)) {
      throw error;
    }

    trackReadFailure('duels.search', error, {
      endpoint,
      method: 'GET',
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.search',
      method: 'GET',
      endpoint,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const createDuelViaApi = async (
  input: KangurDuelCreateInput
): Promise<KangurDuelStateResponse> => {
  try {
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
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('duels.create', error, {
      endpoint: KANGUR_DUELS_CREATE_ENDPOINT,
      method: 'POST',
      mode: input.mode,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.create',
      method: 'POST',
      endpoint: KANGUR_DUELS_CREATE_ENDPOINT,
      mode: input.mode,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const joinDuelViaApi = async (
  input: KangurDuelJoinInput
): Promise<KangurDuelStateResponse> => {
  try {
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
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('duels.join', error, {
      endpoint: KANGUR_DUELS_JOIN_ENDPOINT,
      method: 'POST',
      sessionId: input.sessionId ?? null,
      mode: input.mode ?? null,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.join',
      method: 'POST',
      endpoint: KANGUR_DUELS_JOIN_ENDPOINT,
      sessionId: input.sessionId ?? null,
      mode: input.mode ?? null,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const submitDuelAnswerViaApi = async (
  input: KangurDuelAnswerInput
): Promise<KangurDuelStateResponse> => {
  try {
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
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('duels.answer', error, {
      endpoint: KANGUR_DUELS_ANSWER_ENDPOINT,
      method: 'POST',
      sessionId: input.sessionId,
      questionId: input.questionId,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.answer',
      method: 'POST',
      endpoint: KANGUR_DUELS_ANSWER_ENDPOINT,
      sessionId: input.sessionId,
      questionId: input.questionId,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};

export const leaveDuelViaApi = async (
  input: KangurDuelLeaveInput
): Promise<KangurDuelStateResponse> => {
  try {
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
  } catch (error: unknown) {
    logClientError(error);
    trackWriteFailure('duels.leave', error, {
      endpoint: KANGUR_DUELS_LEAVE_ENDPOINT,
      method: 'POST',
      sessionId: input.sessionId,
    });
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'duels.leave',
      method: 'POST',
      endpoint: KANGUR_DUELS_LEAVE_ENDPOINT,
      sessionId: input.sessionId,
      ...(isKangurStatusError(error) ? { statusCode: error.status } : {}),
    });
    throw error;
  }
};
