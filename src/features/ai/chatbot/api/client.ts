import { logClientError } from '@/shared/utils/observability/client-error-logger';
const defaultErrorMessage = 'Request failed.';

export const readErrorResponse = async (
  res: Response
): Promise<{ message: string; errorId?: string }> => {
  try {
    const data = (await res.json()) as { error?: string; errorId?: string };
    return {
      message: data.error || defaultErrorMessage,
      ...(typeof data.errorId === 'string' ? { errorId: data.errorId } : {}),
    };
  } catch (error) {
    logClientError(error);
    try {
      const text = await res.text();
      return { message: text || defaultErrorMessage };
    } catch (error) {
      logClientError(error);
      return { message: defaultErrorMessage };
    }
  }
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const readErrorMessage = async (res: Response, fallbackMessage: string): Promise<string> => {
  const error = await readErrorResponse(res);
  const message =
    error.message && error.message !== defaultErrorMessage ? error.message : fallbackMessage;
  const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : '';
  return `${message}${suffix}`;
};

export const requestJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number; fallbackMessage?: string }
): Promise<T> => {
  const initOptions = init ?? {};
  const res = options?.timeoutMs
    ? await fetchWithTimeout(input, initOptions, options.timeoutMs)
    : await fetch(input, initOptions);
  if (!res.ok) {
    const message = await readErrorMessage(res, options?.fallbackMessage ?? defaultErrorMessage);
    throw new Error(message);
  }
  return (await res.json()) as T;
};
