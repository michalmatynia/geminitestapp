import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
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

export type KangurApiRequestError = Error & {
  status: number;
  statusText: string;
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

export const createKangurApiRequestError = (
  response: Pick<Response, 'status' | 'statusText'>,
  path: string,
): KangurApiRequestError => {
  const error = new Error(
    `Kangur API request failed: ${response.status} ${response.statusText} (${path})`,
  ) as KangurApiRequestError;
  error.status = response.status;
  error.statusText = response.statusText;
  return error;
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

    if (!response.ok) {
      throw createKangurApiRequestError(response, path);
    }

    return (await response.json()) as TResponse;
  };

  return {
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
  buildProgressPath as buildKangurProgressPath,
  buildScoreListPath as buildKangurScoreListPath,
  ASSIGNMENTS_PATH as KANGUR_ASSIGNMENTS_PATH,
  SUBJECT_FOCUS_PATH as KANGUR_SUBJECT_FOCUS_PATH,
};
