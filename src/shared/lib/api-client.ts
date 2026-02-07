import { logClientError } from '@/features/observability';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

export interface ApiClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  logError?: boolean;
  timeout?: number;
}

export class ApiError extends Error {
  status: number;
  errorId?: string | undefined;

  constructor(message: string, status: number, errorId?: string | undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorId = errorId;
  }
}

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = {
    method: customConfig.method || (customConfig.body ? 'POST' : 'GET'),
    ...customConfig,
    headers: withCsrfHeaders({
      ...headers,
      ...customConfig.headers,
    } as Record<string, string>),
    signal: customConfig.signal || controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timer);

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (response.ok) {
      return data as T;
    }

    const errorMessage = data?.error || data?.message || response.statusText || 'Unknown API Error';
    const errorId = data?.errorId;
    const error = new ApiError(errorMessage, response.status, errorId);

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
  }
}

export const api = {
  get: <T>(endpoint: string, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: ApiClientOptions) => 
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
