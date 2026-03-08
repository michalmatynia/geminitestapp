import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurAuthUser,
  KangurLearnerSignInInput,
  KangurProgressState,
  KangurScore,
  KangurScoreCreateInput,
  KangurScoreListQuery,
} from '@kangur/contracts';

export type KangurApiClientOptions = {
  baseUrl?: string;
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
  getHeaders?: () => Promise<HeadersInit> | HeadersInit;
  onResponse?: (response: Response) => Promise<void> | void;
};

export type KangurApiRequestOptions = Omit<
  RequestInit,
  'body' | 'headers' | 'method'
> & {
  headers?: HeadersInit;
};

export type KangurApiRequestError = Error & {
  status: number;
  statusText: string;
  details?: unknown;
  errorId?: string;
};

const ASSIGNMENTS_PATH = '/api/kangur/assignments';
const AUTH_LEARNER_SIGN_IN_PATH = '/api/kangur/auth/learner-signin';
const AUTH_LEARNER_SIGN_OUT_PATH = '/api/kangur/auth/learner-signout';
const AUTH_ME_PATH = '/api/kangur/auth/me';
const AUTH_LOGOUT_PATH = '/api/kangur/auth/logout';
const PROGRESS_PATH = '/api/kangur/progress';
const SCORES_PATH = '/api/kangur/scores';

const resolveBaseUrl = (baseUrl?: string): string =>
  baseUrl?.replace(/\/$/, '') ?? '';

const looksLikeHtml = (value: string): boolean =>
  /<!doctype|<html|<head|<body/i.test(value);

const resolveHeaders = async (
  getHeaders?: KangurApiClientOptions['getHeaders'],
  requestHeaders?: HeadersInit,
  includeJsonContentType = false
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

const buildProgressPath = (): string => PROGRESS_PATH;

const buildScoreListPath = (query: KangurScoreListQuery = {}): string => {
  const search = new URLSearchParams();

  if (query.sort) {
    search.set('sort', query.sort);
  }
  if (typeof query.limit === 'number') {
    search.set('limit', String(query.limit));
  }
  if (query.player_name) {
    search.set('player_name', query.player_name);
  }
  if (query.operation) {
    search.set('operation', query.operation);
  }
  if (query.created_by) {
    search.set('created_by', query.created_by);
  }
  if (query.learner_id) {
    search.set('learner_id', query.learner_id);
  }

  const serialized = search.toString();
  return serialized ? `${SCORES_PATH}?${serialized}` : SCORES_PATH;
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

export const createKangurApiRequestError = async (
  response: Pick<Response, 'status' | 'statusText'> &
    Partial<Pick<Response, 'text' | 'headers'>>,
  path: string
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
    return error;
  }

  try {
    const responseText = await response.text();
    const trimmed = responseText.trim();
    let message = defaultMessage;
    let details: unknown;

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
  } catch {
    const error = new Error(defaultMessage) as KangurApiRequestError;
    error.status = response.status;
    error.statusText = response.statusText;
    if (errorId) {
      error.errorId = errorId;
    }
    return error;
  }
};

export const createKangurApiClient = (
  options: KangurApiClientOptions = {}
) => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const credentials = options.credentials;

  const request = async <TResponse>(
    path: string,
    init: RequestInit = {}
  ): Promise<TResponse> => {
    const includeJsonContentType = typeof init.body === 'string';
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      credentials: init.credentials ?? credentials,
      headers: await resolveHeaders(
        options.getHeaders,
        init.headers,
        includeJsonContentType
      ),
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
    init: RequestInit = {}
  ): Promise<TResponse> => {
    const includeJsonContentType = typeof init.body === 'string';
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      credentials: init.credentials ?? credentials,
      headers: await resolveHeaders(
        options.getHeaders,
        init.headers,
        includeJsonContentType
      ),
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
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<{ ok: boolean; learnerId: string; ownerEmail: string | null }>(
        AUTH_LEARNER_SIGN_IN_PATH,
        {
          ...requestOptions,
          method: 'POST',
          body: JSON.stringify(input),
        }
      ),
    signOutLearner: (requestOptions?: KangurApiRequestOptions) =>
      requestOptionalJson<{ ok: boolean }>(
        AUTH_LEARNER_SIGN_OUT_PATH,
        { ok: true },
        {
          ...requestOptions,
          method: 'POST',
        }
      ),
    logout: (requestOptions?: KangurApiRequestOptions) =>
      requestOptionalJson<{ ok: boolean }>(
        AUTH_LOGOUT_PATH,
        { ok: true },
        {
          ...requestOptions,
          method: 'POST',
        }
      ),
    getProgress: (requestOptions?: KangurApiRequestOptions) =>
      request<KangurProgressState>(buildProgressPath(), {
        ...requestOptions,
        method: 'GET',
      }),
    updateProgress: (
      input: KangurProgressState,
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<KangurProgressState>(buildProgressPath(), {
        ...requestOptions,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    listScores: (
      query?: KangurScoreListQuery,
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<KangurScore[]>(buildScoreListPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    createScore: (
      input: KangurScoreCreateInput,
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<KangurScore>(SCORES_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listAssignments: (
      query?: KangurAssignmentListQuery,
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<KangurAssignmentSnapshot[]>(buildAssignmentsPath(query), {
        ...requestOptions,
        method: 'GET',
      }),
    createAssignment: (
      input: KangurAssignmentCreateInput,
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<KangurAssignmentSnapshot>(ASSIGNMENTS_PATH, {
        ...requestOptions,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateAssignment: (
      id: string,
      input: KangurAssignmentUpdateInput,
      requestOptions?: KangurApiRequestOptions
    ) =>
      request<KangurAssignmentSnapshot>(buildAssignmentPath(id), {
        ...requestOptions,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  };
};

export {
  ASSIGNMENTS_PATH as KANGUR_ASSIGNMENTS_PATH,
  AUTH_LEARNER_SIGN_IN_PATH as KANGUR_AUTH_LEARNER_SIGN_IN_PATH,
  AUTH_LEARNER_SIGN_OUT_PATH as KANGUR_AUTH_LEARNER_SIGN_OUT_PATH,
  AUTH_LOGOUT_PATH as KANGUR_AUTH_LOGOUT_PATH,
  AUTH_ME_PATH as KANGUR_AUTH_ME_PATH,
  PROGRESS_PATH as KANGUR_PROGRESS_PATH,
  SCORES_PATH as KANGUR_SCORES_PATH,
  buildAssignmentPath as buildKangurAssignmentPath,
  buildAssignmentsPath as buildKangurAssignmentsPath,
  buildProgressPath as buildKangurProgressPath,
  buildScoreListPath as buildKangurScoreListPath,
};
