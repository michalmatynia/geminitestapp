import {
  AppError,
  AppErrorCodes,
  authError,
  badRequestError,
  conflictError,
  createAppError,
  externalServiceError,
  forbiddenError,
  isAppError,
  notFoundError,
  rateLimitedError,
  serviceUnavailableError,
  timeoutError,
  unprocessableEntityError,
  databaseError,
} from '@/shared/errors/app-error';

export type MapStatusOptions = {
  retryAfterMs?: number;
};

const safeMessage = (message: string | null | undefined, fallback: string): string =>
  message?.trim() ? message : fallback;

export const mapStatusToAppError = (
  message: string,
  status: number,
  options?: MapStatusOptions
): AppError => {
  const msg = safeMessage(message, 'Request failed');
  if (status === 400) return badRequestError(msg);
  if (status === 401) return authError(msg);
  if (status === 403) return forbiddenError(msg);
  if (status === 404) return notFoundError(msg);
  if (status === 409) return conflictError(msg);
  if (status === 422) return unprocessableEntityError(msg);
  if (status === 429) return rateLimitedError(msg, options?.retryAfterMs);
  if (status === 503) return serviceUnavailableError(msg, options?.retryAfterMs);
  if (status === 504) return timeoutError(msg);
  if (status >= 500) {
    return externalServiceError(msg, { status });
  }
  if (status >= 400) {
    return createAppError(msg, {
      code: AppErrorCodes.badRequest,
      httpStatus: status,
      expected: true,
    });
  }
  return createAppError(msg, {
    code: AppErrorCodes.internal,
    httpStatus: 500,
    expected: false,
  });
};

const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNABORTED',
]);

export const mapErrorToAppError = (error: unknown, fallbackMessage?: string): AppError | null => {
  if (isAppError(error)) return error;

  if (error && typeof error === 'object') {
    const err = error as {
      name?: string;
      message?: string;
      status?: number;
      statusCode?: number;
      code?: string | number;
      retryAfterMs?: number;
      retryAfter?: number;
    };

    const status =
      typeof err.status === 'number'
        ? err.status
        : typeof err.statusCode === 'number'
          ? err.statusCode
          : null;

    if (status !== null) {
      const retryAfterMs =
        typeof err.retryAfterMs === 'number'
          ? err.retryAfterMs
          : typeof err.retryAfter === 'number'
            ? err.retryAfter * 1000
            : undefined;
      return mapStatusToAppError(err.message ?? fallbackMessage ?? 'Request failed', status, {
        ...(typeof retryAfterMs === 'number' ? { retryAfterMs } : {}),
      });
    }

    if (err.name === 'AbortError') {
      return timeoutError(fallbackMessage ?? 'Operation timed out');
    }

    if (err.name?.toLowerCase().includes('mongo')) {
      const codeNumber = typeof err.code === 'number' ? err.code : Number(err.code);
      const message = err.message ?? '';
      if (codeNumber === 11000 || message.includes('E11000') || message.includes('duplicate key')) {
        return conflictError('Duplicate entry', {
          mongoCode: err.code,
        });
      }
      if (codeNumber === 121) {
        return unprocessableEntityError('Document validation failed', {
          mongoCode: err.code,
        });
      }
      if (err.name.includes('Network') || err.name.includes('ServerSelection')) {
        return databaseError('Database connection failed', error);
      }
      if (err.name.includes('Timeout') || message.toLowerCase().includes('timed out')) {
        return timeoutError('Database operation timed out', { mongoCode: err.code });
      }
      return databaseError(fallbackMessage ?? 'Database operation failed', error, {
        mongoCode: err.code,
      });
    }

    if (typeof err.code === 'string' && NETWORK_ERROR_CODES.has(err.code)) {
      return externalServiceError(
        fallbackMessage ?? 'Network error',
        { code: err.code },
        { retryable: true }
      );
    }

    if (err.name === 'SyntaxError' && (err.message ?? '').includes('JSON')) {
      return badRequestError('Invalid JSON payload');
    }
  }

  return null;
};
