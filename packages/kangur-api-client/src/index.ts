import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurAuthUser,
  KangurDuelAnswerInput,
  KangurDuelCreateInput,
  KangurDuelHeartbeatInput,
  KangurDuelJoinInput,
  KangurDuelLeaderboardResponse,
  KangurDuelLobbyChatCreateInput,
  KangurDuelLobbyChatListResponse,
  KangurDuelLobbyChatSendResponse,
  KangurDuelLobbyPresenceResponse,
  KangurDuelLobbyResponse,
  KangurDuelOpponentsResponse,
  KangurDuelReactionInput,
  KangurDuelReactionResponse,
  KangurDuelSearchResponse,
  KangurDuelSpectatorStateResponse,
  KangurDuelStateResponse,
  KangurDuelLeaveInput,
  KangurLearnerCreateInput,
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
  KangurLearnerInteractionHistory,
  KangurLearnerProfile,
  KangurLearnerSignInInput,
  KangurLearnerSessionHistory,
  KangurLearnerUpdateInput,
  KangurLessonSubject,
  KangurProgressState,
  KangurScore,
  KangurScoreCreateInput,
  KangurSubjectFocus,
} from '@kangur/contracts';

export type KangurApiClientOptions = {
  baseUrl?: string;
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
  getHeaders?: () => Promise<HeadersInit> | HeadersInit;
  onResponse?: (response: Response) => Promise<void> | void;
};

export type KangurApiRequestOptions = Omit<RequestInit, 'body' | 'headers' | 'method'> & {
  headers?: HeadersInit;
};

export type KangurProgressQuery = {
  subject?: KangurLessonSubject;
};

export type KangurScoreListQuery = {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  subject?: KangurLessonSubject;
  created_by?: string;
  learner_id?: string;
};

export type KangurPaginationQuery = {
  limit?: number;
  offset?: number;
};

export type KangurDuelLimitQuery = {
  limit?: number;
};

export type KangurDuelLeaderboardQuery = KangurDuelLimitQuery & {
  lookbackDays?: number;
};

export type KangurDuelLobbyChatQuery = KangurDuelLimitQuery & {
  before?: string | null;
};

export type KangurDuelSpectatorQuery = {
  spectatorId?: string;
};

export type KangurApiRequestError = Error & {
  status: number;
  statusText: string;
  details?: unknown;
  errorId?: string;
};

const resolveBaseUrl = (baseUrl?: string): string => baseUrl?.replace(/\/$/, '') ?? '';

const resolveHeaders = async (
  getHeaders?: KangurApiClientOptions['getHeaders'],
  requestHeaders?: HeadersInit,
  includeJsonContentType = false,
): Promise<Headers> => {
  const headers = new Headers(await getHeaders?.());
  if (includeJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (requestHeaders) {
    new Headers(requestHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
};

const buildProgressPath = (query?: KangurProgressQuery): string => {
  if (!query?.subject) {
    return '/api/kangur/progress';
  }

  const search = new URLSearchParams();
  search.set('subject', query.subject);
  return `/api/kangur/progress?${search.toString()}`;
};

const SUBJECT_FOCUS_PATH = '/api/kangur/subject-focus';
const ASSIGNMENTS_PATH = '/api/kangur/assignments';
const LEARNERS_PATH = '/api/kangur/learners';
const LEARNER_ACTIVITY_PATH = '/api/kangur/learner-activity';
const AUTH_LEARNER_SIGN_IN_PATH = '/api/kangur/auth/learner-signin';
const AUTH_LEARNER_SIGN_OUT_PATH = '/api/kangur/auth/learner-signout';
const AUTH_ME_PATH = '/api/kangur/auth/me';
const AUTH_LOGOUT_PATH = '/api/kangur/auth/logout';
const DUELS_CREATE_PATH = '/api/kangur/duels/create';
const DUELS_JOIN_PATH = '/api/kangur/duels/join';
const DUELS_STATE_PATH = '/api/kangur/duels/state';
const DUELS_LOBBY_PATH = '/api/kangur/duels/lobby';
const DUELS_LOBBY_PRESENCE_PATH = '/api/kangur/duels/lobby-presence';
const DUELS_LOBBY_CHAT_PATH = '/api/kangur/duels/lobby-chat';
const DUELS_OPPONENTS_PATH = '/api/kangur/duels/opponents';
const DUELS_SEARCH_PATH = '/api/kangur/duels/search';
const DUELS_ANSWER_PATH = '/api/kangur/duels/answer';
const DUELS_LEAVE_PATH = '/api/kangur/duels/leave';
const DUELS_HEARTBEAT_PATH = '/api/kangur/duels/heartbeat';
const DUELS_REACTION_PATH = '/api/kangur/duels/reaction';
const DUELS_SPECTATE_PATH = '/api/kangur/duels/spectate';
const DUELS_LEADERBOARD_PATH = '/api/kangur/duels/leaderboard';

const looksLikeHtml = (value: string): boolean => /<!doctype|<html|<head|<body/i.test(value);
const normalizeQueryInteger = (value: number | undefined, minimum = 1): number | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.floor(value))
    : null;

const buildScoreListPath = (query: KangurScoreListQuery = {}): string => {
  const search = new URLSearchParams();

  if (query.sort) search.set('sort', query.sort);
  if (typeof query.limit === 'number') search.set('limit', String(query.limit));
  if (query.player_name) search.set('player_name', query.player_name);
  if (query.operation) search.set('operation', query.operation);
  if (query.subject) search.set('subject', query.subject);
  if (query.created_by) search.set('created_by', query.created_by);
  if (query.learner_id) search.set('learner_id', query.learner_id);

  const serialized = search.toString();
  return serialized ? `/api/kangur/scores?${serialized}` : '/api/kangur/scores';
};

const buildAssignmentsPath = (query?: KangurAssignmentListQuery): string => {
  const search = new URLSearchParams();

  if (query?.includeArchived) {
    search.set('includeArchived', 'true');
  }

  const serialized = search.toString();
  return serialized ? `${ASSIGNMENTS_PATH}?${serialized}` : ASSIGNMENTS_PATH;
};

const buildAssignmentPath = (id: string): string =>
  `${ASSIGNMENTS_PATH}/${encodeURIComponent(id)}`;

const buildAssignmentReassignPath = (id: string): string =>
  `${buildAssignmentPath(id)}/reassign`;

const buildLearnerPath = (id: string): string => `${LEARNERS_PATH}/${encodeURIComponent(id)}`;

const buildLearnerNestedPath = (
  learnerId: string,
  suffix: 'sessions' | 'interactions',
  query?: KangurPaginationQuery,
): string => {
  const search = new URLSearchParams();

  if (typeof query?.limit === 'number' && Number.isFinite(query.limit)) {
    search.set('limit', String(Math.max(1, Math.floor(query.limit))));
  }
  if (typeof query?.offset === 'number' && Number.isFinite(query.offset)) {
    search.set('offset', String(Math.max(0, Math.floor(query.offset))));
  }

  const path = `${buildLearnerPath(learnerId)}/${suffix}`;
  const serialized = search.toString();
  return serialized ? `${path}?${serialized}` : path;
};

const buildLearnerSessionsPath = (learnerId: string, query?: KangurPaginationQuery): string =>
  buildLearnerNestedPath(learnerId, 'sessions', query);

const buildLearnerInteractionsPath = (learnerId: string, query?: KangurPaginationQuery): string =>
  buildLearnerNestedPath(learnerId, 'interactions', query);

const buildDuelStatePath = (sessionId: string): string =>
  `${DUELS_STATE_PATH}?sessionId=${encodeURIComponent(sessionId)}`;

const buildDuelSpectatePath = (
  sessionId: string,
  query?: KangurDuelSpectatorQuery,
): string => {
  const search = new URLSearchParams({ sessionId });
  if (query?.spectatorId) {
    search.set('spectatorId', query.spectatorId);
  }
  return `${DUELS_SPECTATE_PATH}?${search.toString()}`;
};

const buildDuelLobbyPath = (query?: KangurDuelLimitQuery): string => {
  const limit = normalizeQueryInteger(query?.limit);
  return limit ? `${DUELS_LOBBY_PATH}?limit=${encodeURIComponent(limit)}` : DUELS_LOBBY_PATH;
};

const buildDuelLobbyPresencePath = (query?: KangurDuelLimitQuery): string => {
  const limit = normalizeQueryInteger(query?.limit);
  return limit
    ? `${DUELS_LOBBY_PRESENCE_PATH}?limit=${encodeURIComponent(limit)}`
    : DUELS_LOBBY_PRESENCE_PATH;
};

const buildDuelLeaderboardPath = (query?: KangurDuelLeaderboardQuery): string => {
  const search = new URLSearchParams();
  const limit = normalizeQueryInteger(query?.limit);
  const lookbackDays = normalizeQueryInteger(query?.lookbackDays);

  if (limit) {
    search.set('limit', String(limit));
  }
  if (lookbackDays) {
    search.set('lookbackDays', String(lookbackDays));
  }

  const serialized = search.toString();
  return serialized ? `${DUELS_LEADERBOARD_PATH}?${serialized}` : DUELS_LEADERBOARD_PATH;
};

const buildDuelLobbyChatPath = (query?: KangurDuelLobbyChatQuery): string => {
  const search = new URLSearchParams();
  const limit = normalizeQueryInteger(query?.limit);
  const before =
    typeof query?.before === 'string' && query.before.trim().length > 0
      ? query.before.trim()
      : null;

  if (limit) {
    search.set('limit', String(limit));
  }
  if (before) {
    search.set('before', before);
  }

  const serialized = search.toString();
  return serialized ? `${DUELS_LOBBY_CHAT_PATH}?${serialized}` : DUELS_LOBBY_CHAT_PATH;
};

const buildDuelOpponentsPath = (query?: KangurDuelLimitQuery): string => {
  const limit = normalizeQueryInteger(query?.limit);
  return limit
    ? `${DUELS_OPPONENTS_PATH}?limit=${encodeURIComponent(limit)}`
    : DUELS_OPPONENTS_PATH;
};

const buildDuelSearchPath = (searchQuery: string, query?: KangurDuelLimitQuery): string => {
  const search = new URLSearchParams();
  const limit = normalizeQueryInteger(query?.limit);

  search.set('q', searchQuery.trim());
  if (limit) {
    search.set('limit', String(limit));
  }

  return `${DUELS_SEARCH_PATH}?${search.toString()}`;
};

export const createKangurApiRequestError = (
  response: Pick<Response, 'status' | 'statusText'> &
    Partial<Pick<Response, 'text' | 'headers'>>,
  path: string,
): Promise<KangurApiRequestError> => {
  const defaultMessage = `Kangur API request failed: ${response.status} ${response.statusText} (${path})`;
  const errorId = response.headers?.get?.('x-error-id') ?? undefined;

  if (typeof response.text !== 'function') {
    const error = new Error(defaultMessage) as KangurApiRequestError;
    error.status = response.status;
    error.statusText = response.statusText;
    if (errorId) {
      error.errorId = errorId;
    }
    return Promise.resolve(error);
  }

  return response
    .text()
    .then((responseText) => {
      let message = defaultMessage;
      let details: unknown;
      const trimmed = responseText.trim();

      if (trimmed.length > 0) {
        try {
          const payload = JSON.parse(trimmed) as Record<string, unknown>;
          if (typeof payload['error'] === 'string') {
            message = payload['error'];
          } else if (typeof payload['message'] === 'string') {
            message = payload['message'];
          } else if (!looksLikeHtml(trimmed)) {
            message = trimmed.slice(0, 240);
          }
          if (payload['details'] !== undefined) {
            details = payload['details'];
          }
        } catch {
          if (!looksLikeHtml(trimmed)) {
            message = trimmed.slice(0, 240);
          }
        }
      }

      const error = new Error(message) as KangurApiRequestError;
      error.status = response.status;
      error.statusText = response.statusText;
      if (details !== undefined) {
        error.details = details;
      }
      if (errorId) {
        error.errorId = errorId;
      }
      return error;
    })
    .catch(() => {
      const error = new Error(defaultMessage) as KangurApiRequestError;
      error.status = response.status;
      error.statusText = response.statusText;
      if (errorId) {
        error.errorId = errorId;
      }
      return error;
    });
};

export const createKangurApiClient = (options: KangurApiClientOptions = {}) => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const credentials = options.credentials;

  const request = async <TResponse>(
    path: string,
    init: RequestInit = {},
  ): Promise<TResponse> => {
    const includeJsonContentType = typeof init.body === 'string';
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      credentials: init.credentials ?? credentials,
      headers: await resolveHeaders(options.getHeaders, init.headers, includeJsonContentType),
    });
    await options.onResponse?.(response);

    if (!response.ok) {
      throw await createKangurApiRequestError(response, path);
    }

    return (await response.json()) as TResponse;
  };

  const requestOptionalJson = async <TResponse>(
    path: string,
    fallback: TResponse,
    init: RequestInit = {},
  ): Promise<TResponse> => {
    const includeJsonContentType = typeof init.body === 'string';
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      credentials: init.credentials ?? credentials,
      headers: await resolveHeaders(options.getHeaders, init.headers, includeJsonContentType),
    });
    await options.onResponse?.(response);

    if (!response.ok) {
      throw await createKangurApiRequestError(response, path);
    }

    if (response.status === 204 || typeof response.json !== 'function') {
      return fallback;
    }

    try {
      return (await response.json()) as TResponse;
    } catch {
      return fallback;
    }
  };

  return {
    getAuthMe: (requestOptions?: KangurApiRequestOptions) =>
      request<KangurAuthUser>(AUTH_ME_PATH, {
        ...requestOptions,
        method: 'GET',
      }),
    signInLearner: (
      input: KangurLearnerSignInInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<{ learnerId: string; ok: boolean; ownerEmail: string | null }>(
        AUTH_LEARNER_SIGN_IN_PATH,
        {
          ...requestOptions,
          body: JSON.stringify(input),
          method: 'POST',
        },
      ),
    signOutLearner: (requestOptions?: KangurApiRequestOptions) =>
      requestOptionalJson<{ ok: boolean }>(
        AUTH_LEARNER_SIGN_OUT_PATH,
        { ok: true },
        {
          ...requestOptions,
          method: 'POST',
        },
      ),
    logout: (requestOptions?: KangurApiRequestOptions) =>
      requestOptionalJson<{ ok: boolean }>(AUTH_LOGOUT_PATH, { ok: true }, {
        ...requestOptions,
        method: 'POST',
      }),
    getProgress: (
      query?: KangurProgressQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurProgressState>(buildProgressPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    updateProgress: (
      input: KangurProgressState,
      query?: KangurProgressQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurProgressState>(buildProgressPath(query), {
        ...requestOptions,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    getSubjectFocus: (requestOptions?: KangurApiRequestOptions) =>
      request<KangurSubjectFocus>(SUBJECT_FOCUS_PATH, {
        ...requestOptions,
        method: 'GET',
      }),
    updateSubjectFocus: (
      input: KangurSubjectFocus,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurSubjectFocus>(SUBJECT_FOCUS_PATH, {
        ...requestOptions,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    getLearnerActivity: (requestOptions?: KangurApiRequestOptions) =>
      request<KangurLearnerActivityStatus>(LEARNER_ACTIVITY_PATH, {
        ...requestOptions,
        method: 'GET',
      }),
    updateLearnerActivity: (
      input: KangurLearnerActivityUpdateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurLearnerActivitySnapshot>(LEARNER_ACTIVITY_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getDuelState: (sessionId: string, requestOptions?: KangurApiRequestOptions) =>
      request<KangurDuelStateResponse>(buildDuelStatePath(sessionId), {
        ...requestOptions,
        method: 'GET',
      }),
    getDuelSpectatorState: (
      sessionId: string,
      query?: KangurDuelSpectatorQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelSpectatorStateResponse>(buildDuelSpectatePath(sessionId, query), {
        ...requestOptions,
        method: 'GET',
      }),
    listDuelLobby: (
      query?: KangurDuelLimitQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelLobbyResponse>(buildDuelLobbyPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    listDuelLobbyPresence: (
      query?: KangurDuelLimitQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelLobbyPresenceResponse>(buildDuelLobbyPresencePath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    getDuelLeaderboard: (
      query?: KangurDuelLeaderboardQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelLeaderboardResponse>(buildDuelLeaderboardPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    listDuelLobbyChat: (
      query?: KangurDuelLobbyChatQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelLobbyChatListResponse>(buildDuelLobbyChatPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    listDuelOpponents: (
      query?: KangurDuelLimitQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelOpponentsResponse>(buildDuelOpponentsPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    searchDuels: (
      searchQuery: string,
      query?: KangurDuelLimitQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelSearchResponse>(buildDuelSearchPath(searchQuery, query), {
        ...requestOptions,
        method: 'GET',
      }),
    pingDuelLobbyPresence: (
      query?: KangurDuelLimitQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelLobbyPresenceResponse>(buildDuelLobbyPresencePath(query), {
        ...requestOptions,
        method: 'POST',
      }),
    sendDuelLobbyChatMessage: (
      input: KangurDuelLobbyChatCreateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelLobbyChatSendResponse>(DUELS_LOBBY_CHAT_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    createDuel: (input: KangurDuelCreateInput, requestOptions?: KangurApiRequestOptions) =>
      request<KangurDuelStateResponse>(DUELS_CREATE_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    joinDuel: (input: KangurDuelJoinInput, requestOptions?: KangurApiRequestOptions) =>
      request<KangurDuelStateResponse>(DUELS_JOIN_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    heartbeatDuel: (
      input: KangurDuelHeartbeatInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurDuelStateResponse>(DUELS_HEARTBEAT_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    answerDuel: (input: KangurDuelAnswerInput, requestOptions?: KangurApiRequestOptions) =>
      request<KangurDuelStateResponse>(DUELS_ANSWER_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    reactToDuel: (input: KangurDuelReactionInput, requestOptions?: KangurApiRequestOptions) =>
      request<KangurDuelReactionResponse>(DUELS_REACTION_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    leaveDuel: (input: KangurDuelLeaveInput, requestOptions?: KangurApiRequestOptions) =>
      request<KangurDuelStateResponse>(DUELS_LEAVE_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listAssignments: (
      query?: KangurAssignmentListQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurAssignmentSnapshot[]>(buildAssignmentsPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    createAssignment: (
      input: KangurAssignmentCreateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurAssignmentSnapshot>(ASSIGNMENTS_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateAssignment: (
      id: string,
      input: KangurAssignmentUpdateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurAssignmentSnapshot>(buildAssignmentPath(id), {
        ...requestOptions,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    reassignAssignment: (id: string, requestOptions?: KangurApiRequestOptions) =>
      request<KangurAssignmentSnapshot>(buildAssignmentReassignPath(id), {
        ...requestOptions,
        method: 'POST',
      }),
    listLearners: (requestOptions?: KangurApiRequestOptions) =>
      request<KangurLearnerProfile[]>(LEARNERS_PATH, {
        ...requestOptions,
        method: 'GET',
      }),
    createLearner: (
      input: KangurLearnerCreateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurLearnerProfile>(LEARNERS_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateLearner: (
      id: string,
      input: KangurLearnerUpdateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurLearnerProfile>(buildLearnerPath(id), {
        ...requestOptions,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteLearner: (id: string, requestOptions?: KangurApiRequestOptions) =>
      request<KangurLearnerProfile>(buildLearnerPath(id), {
        ...requestOptions,
        method: 'DELETE',
      }),
    listLearnerSessions: (
      learnerId: string,
      query?: KangurPaginationQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurLearnerSessionHistory>(buildLearnerSessionsPath(learnerId, query), {
        ...requestOptions,
        method: 'GET',
      }),
    listLearnerInteractions: (
      learnerId: string,
      query?: KangurPaginationQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurLearnerInteractionHistory>(buildLearnerInteractionsPath(learnerId, query), {
        ...requestOptions,
        method: 'GET',
      }),
    listScores: (
      query?: KangurScoreListQuery,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurScore[]>(buildScoreListPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    createScore: (
      input: KangurScoreCreateInput,
      requestOptions?: KangurApiRequestOptions,
    ) =>
      request<KangurScore>('/api/kangur/scores', {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
  };
};

export {
  buildAssignmentsPath as buildKangurAssignmentsPath,
  buildAssignmentPath as buildKangurAssignmentPath,
  buildAssignmentReassignPath as buildKangurAssignmentReassignPath,
  buildDuelLeaderboardPath as buildKangurDuelLeaderboardPath,
  buildDuelLobbyChatPath as buildKangurDuelLobbyChatPath,
  buildDuelLobbyPath as buildKangurDuelLobbyPath,
  buildDuelLobbyPresencePath as buildKangurDuelLobbyPresencePath,
  buildDuelOpponentsPath as buildKangurDuelOpponentsPath,
  buildDuelSearchPath as buildKangurDuelSearchPath,
  buildDuelSpectatePath as buildKangurDuelSpectatePath,
  buildDuelStatePath as buildKangurDuelStatePath,
  buildLearnerInteractionsPath as buildKangurLearnerInteractionsPath,
  buildLearnerPath as buildKangurLearnerPath,
  buildLearnerSessionsPath as buildKangurLearnerSessionsPath,
  buildProgressPath as buildKangurProgressPath,
  buildScoreListPath as buildKangurScoreListPath,
  ASSIGNMENTS_PATH as KANGUR_ASSIGNMENTS_PATH,
  AUTH_LOGOUT_PATH as KANGUR_AUTH_LOGOUT_PATH,
  AUTH_ME_PATH as KANGUR_AUTH_ME_PATH,
  DUELS_ANSWER_PATH as KANGUR_DUELS_ANSWER_PATH,
  DUELS_CREATE_PATH as KANGUR_DUELS_CREATE_PATH,
  DUELS_HEARTBEAT_PATH as KANGUR_DUELS_HEARTBEAT_PATH,
  DUELS_JOIN_PATH as KANGUR_DUELS_JOIN_PATH,
  DUELS_LEADERBOARD_PATH as KANGUR_DUELS_LEADERBOARD_PATH,
  DUELS_LEAVE_PATH as KANGUR_DUELS_LEAVE_PATH,
  DUELS_LOBBY_CHAT_PATH as KANGUR_DUELS_LOBBY_CHAT_PATH,
  DUELS_LOBBY_PATH as KANGUR_DUELS_LOBBY_PATH,
  DUELS_LOBBY_PRESENCE_PATH as KANGUR_DUELS_LOBBY_PRESENCE_PATH,
  DUELS_OPPONENTS_PATH as KANGUR_DUELS_OPPONENTS_PATH,
  DUELS_REACTION_PATH as KANGUR_DUELS_REACTION_PATH,
  DUELS_SEARCH_PATH as KANGUR_DUELS_SEARCH_PATH,
  DUELS_SPECTATE_PATH as KANGUR_DUELS_SPECTATE_PATH,
  DUELS_STATE_PATH as KANGUR_DUELS_STATE_PATH,
  LEARNER_ACTIVITY_PATH as KANGUR_LEARNER_ACTIVITY_PATH,
  LEARNERS_PATH as KANGUR_LEARNERS_PATH,
  SUBJECT_FOCUS_PATH as KANGUR_SUBJECT_FOCUS_PATH,
};
