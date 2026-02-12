import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { ErrorCategory, type SuggestedAction } from '@/shared/types/observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface ApiClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  logError?: boolean;
  timeout?: number;
}

export class ApiError extends Error {
  status: number;
  errorId?: string | undefined;
  category?: ErrorCategory | string | undefined;
  suggestedActions?: SuggestedAction[] | undefined;
  payload?: unknown | undefined;

  constructor(
    message: string,
    status: number,
    errorId?: string | undefined,
    category?: ErrorCategory | string | undefined,
    suggestedActions?: SuggestedAction[] | undefined
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorId = errorId;
    this.category = category;
    this.suggestedActions = suggestedActions;
  }
}

const isAbortSignalInstance = (value: unknown): value is AbortSignal => {
  if (!value || typeof value !== 'object') return false;
  if (typeof AbortSignal === 'undefined') return false;
  return value instanceof AbortSignal;
};

export async function apiClient<T>(
  endpoint: string,
  { params, logError = true, timeout = 15000, ...customConfig }: ApiClientOptions = {}
): Promise<T> {
  const isFormData = customConfig.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  
  // Build URL with query parameters
  let url = endpoint;
  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const config: RequestInit = {
    method: customConfig.method || (customConfig.body ? 'POST' : 'GET'),
    ...customConfig,
    headers: withCsrfHeaders({
      ...headers,
      ...customConfig.headers,
    } as Record<string, string>),
  };
  if (isAbortSignalInstance(customConfig.signal)) {
    config.signal = customConfig.signal;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const fetchPromise = fetch(url, config);
    const response = timeout > 0
      ? await Promise.race<Response>([
        fetchPromise,
        new Promise<Response>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);
        }),
      ])
      : await fetchPromise;

    if (response.status === 204) {
      return {} as T;
    }

    const data: unknown = await response.json().catch(() => null);

    if (response.ok) {
      return data as T;
    }

    let errorMessage = response.statusText || 'Unknown API Error';
    let errorId: string | undefined;
    let category: ErrorCategory | string | undefined;
    let suggestedActions: SuggestedAction[] | undefined;

    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      errorMessage = String(dataObj['error'] || dataObj['message'] || errorMessage);
      if (typeof dataObj['errorId'] === 'string') {
        errorId = dataObj['errorId'];
      }
      if (typeof dataObj['category'] === 'string') {
        category = dataObj['category'] as ErrorCategory;
      }
      if (Array.isArray(dataObj['suggestedActions'])) {
        suggestedActions = dataObj['suggestedActions'] as SuggestedAction[];
      }
    }

    const error = new ApiError(errorMessage, response.status, errorId, category, suggestedActions);

    if (logError) {
      logClientError(error, { 
        context: { 
          endpoint, 
          method: config.method, 
          status: response.status,
          params 
        } 
      });
    }

    throw error;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const genericError = new Error(error instanceof Error ? error.message : 'Network Error');
    if (logError) {
      logClientError(genericError, { context: { endpoint, method: config.method, params } });
    }
    throw genericError;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export const api = {
  get: <T>(endpoint: string, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
