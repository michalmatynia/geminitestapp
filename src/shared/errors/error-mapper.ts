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
import { resolveErrorCatalogMessage } from '@/shared/errors/error-catalog';
import type { MapStatusOptions } from '@/shared/contracts/base';

const safeMessage = (message: string | null | undefined, fallback: string): string =>
  message?.trim() ? message : fallback;

export const mapStatusToAppError = (
  message: string,
  status: number,
  options?: MapStatusOptions
): AppError => {
  const resolveFallback = (
    code: (typeof AppErrorCodes)[keyof typeof AppErrorCodes],
    fallback: string
  ) => resolveErrorCatalogMessage(code, fallback);
  const msg = safeMessage(message, resolveFallback(AppErrorCodes.badRequest, 'Request failed'));
  if (status === 400) return badRequestError(msg);
  if (status === 401)
    return authError(
      safeMessage(message, resolveFallback(AppErrorCodes.unauthorized, 'Unauthorized'))
    );
  if (status === 403)
    return forbiddenError(
      safeMessage(message, resolveFallback(AppErrorCodes.forbidden, 'Forbidden'))
    );
  if (status === 404)
    return notFoundError(
      safeMessage(message, resolveFallback(AppErrorCodes.notFound, 'Not found'))
    );
  if (status === 409)
    return conflictError(
      safeMessage(message, resolveFallback(AppErrorCodes.conflict, 'Conflict'))
    );
  if (status === 422)
    return unprocessableEntityError(
      safeMessage(
        message,
        resolveFallback(AppErrorCodes.unprocessableEntity, 'Unprocessable entity')
      )
    );
  if (status === 429)
    return rateLimitedError(
      safeMessage(message, resolveFallback(AppErrorCodes.rateLimited, 'Too many requests')),
      options?.retryAfterMs
    );
  if (status === 503)
    return serviceUnavailableError(
      safeMessage(
        message,
        resolveFallback(AppErrorCodes.serviceUnavailable, 'Service temporarily unavailable')
      ),
      options?.retryAfterMs
    );
  if (status === 504)
    return timeoutError(
      safeMessage(message, resolveFallback(AppErrorCodes.timeout, 'Operation timed out'))
    );
  if (status >= 500) {
    return externalServiceError(
      safeMessage(
        message,
        resolveFallback(AppErrorCodes.externalService, 'External service error')
      ),
      { status }
    );
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
      return timeoutError(
        fallbackMessage ??
          resolveErrorCatalogMessage(AppErrorCodes.timeout, 'Operation timed out')
      );
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
        return timeoutError(
          resolveErrorCatalogMessage(AppErrorCodes.timeout, 'Database operation timed out'),
          { mongoCode: err.code }
        );
      }
      return databaseError(fallbackMessage ?? 'Database operation failed', error, {
        mongoCode: err.code,
      });
    }

    if (typeof err.code === 'string' && NETWORK_ERROR_CODES.has(err.code)) {
      return externalServiceError(
        fallbackMessage ??
          resolveErrorCatalogMessage(AppErrorCodes.externalService, 'Network error'),
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
