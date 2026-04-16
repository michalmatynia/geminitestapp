import {
  type AppError,
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

const resolveFallbackMessage = (
  code: (typeof AppErrorCodes)[keyof typeof AppErrorCodes],
  fallback: string
): string => resolveErrorCatalogMessage(code, fallback);

const resolveMappedStatusMessage = (
  message: string,
  code: (typeof AppErrorCodes)[keyof typeof AppErrorCodes],
  fallback: string
): string => safeMessage(message, resolveFallbackMessage(code, fallback));

type StatusErrorFactory = (message: string, options?: MapStatusOptions) => AppError;

const STATUS_ERROR_FACTORIES: Partial<Record<number, StatusErrorFactory>> = {
  400: (message) =>
    badRequestError(resolveMappedStatusMessage(message, AppErrorCodes.badRequest, 'Request failed')),
  401: (message) =>
    authError(resolveMappedStatusMessage(message, AppErrorCodes.unauthorized, 'Unauthorized')),
  403: (message) =>
    forbiddenError(resolveMappedStatusMessage(message, AppErrorCodes.forbidden, 'Forbidden')),
  404: (message) =>
    notFoundError(resolveMappedStatusMessage(message, AppErrorCodes.notFound, 'Not found')),
  409: (message) =>
    conflictError(resolveMappedStatusMessage(message, AppErrorCodes.conflict, 'Conflict')),
  422: (message) =>
    unprocessableEntityError(
      resolveMappedStatusMessage(message, AppErrorCodes.unprocessableEntity, 'Unprocessable entity')
    ),
  429: (message, options) =>
    rateLimitedError(
      resolveMappedStatusMessage(message, AppErrorCodes.rateLimited, 'Too many requests'),
      options?.retryAfterMs
    ),
  503: (message, options) =>
    serviceUnavailableError(
      resolveMappedStatusMessage(
        message,
        AppErrorCodes.serviceUnavailable,
        'Service temporarily unavailable'
      ),
      options?.retryAfterMs
    ),
  504: (message) =>
    timeoutError(resolveMappedStatusMessage(message, AppErrorCodes.timeout, 'Operation timed out')),
};

export const mapStatusToAppError = (
  message: string,
  status: number,
  options?: MapStatusOptions
): AppError => {
  const mappedFactory = STATUS_ERROR_FACTORIES[status];
  if (mappedFactory) {
    return mappedFactory(message, options);
  }
  const msg = resolveMappedStatusMessage(message, AppErrorCodes.badRequest, 'Request failed');
  if (status >= 500) {
    return externalServiceError(
      resolveMappedStatusMessage(message, AppErrorCodes.externalService, 'External service error'),
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

const resolveRetryAfterMs = (error: {
  retryAfterMs?: number;
  retryAfter?: number;
}): number | undefined => {
  if (typeof error.retryAfterMs === 'number') return error.retryAfterMs;
  if (typeof error.retryAfter === 'number') return error.retryAfter * 1000;
  return undefined;
};

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
      const retryAfterMs = resolveRetryAfterMs(err);
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
