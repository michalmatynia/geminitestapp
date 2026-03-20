export type KangurApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getHeaders?: () => Promise<HeadersInit> | HeadersInit;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
} as const;

const resolveBaseUrl = (baseUrl?: string): string => baseUrl?.replace(/\/$/, '') ?? '';

const resolveHeaders = async (
  getHeaders?: KangurApiClientOptions['getHeaders']
): Promise<HeadersInit> => {
  const headers = await getHeaders?.();
  return {
    ...jsonHeaders,
    ...(headers ?? {}),
  };
};

export const createKangurApiClient = (options: KangurApiClientOptions = {}) => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);

  const request = async <TResponse>(
    path: string,
    init?: RequestInit
  ): Promise<TResponse> => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(await resolveHeaders(options.getHeaders)),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Kangur API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TResponse;
  };

  return {
    getProgress: <TResponse>(subject?: string) =>
      request<TResponse>(
        subject ? `/api/kangur/progress?subject=${encodeURIComponent(subject)}` : '/api/kangur/progress'
      ),
    updateProgress: <TRequest, TResponse>(input: TRequest, subject?: string) =>
      request<TResponse>(
        subject ? `/api/kangur/progress?subject=${encodeURIComponent(subject)}` : '/api/kangur/progress',
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        }
      ),
    listScores: <TResponse>() => request<TResponse>('/api/kangur/scores'),
    createScore: <TRequest, TResponse>(input: TRequest) =>
      request<TResponse>('/api/kangur/scores', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  };
};
