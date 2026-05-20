/**
 * Error Mapper
 * 
 * Error transformation and mapping utilities.
 * Provides:
 * - External error to AppError mapping
 * - Error code normalization
 * - HTTP status code mapping
 * - Error type detection and conversion
 * - Standardized error transformation
 */

/* eslint-disable complexity, max-lines-per-function */

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
import {
  isLocalDatabaseConnectionRefused,
  LOCAL_DATABASE_SERVER_UNAVAILABLE_MESSAGE,
} from '@/shared/errors/database-error-guidance';
import type { MapStatusOptions } from '@/shared/contracts/base';

const safeMessage = (message: string | null | undefined, fallback: string): string => {
  const trimmed = message?.trim() ?? '';
  return trimmed.length > 0 ? (message ?? fallback) : fallback;
};

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

/**
 * Maps HTTP status codes to appropriate AppError factory functions.
 * Each status code is mapped to a specific error type with contextual message.
 */
const STATUS_ERROR_FACTORIES: Partial<Record<number, StatusErrorFactory>> = {
  // 400 Bad Request - Malformed request syntax or invalid request message framing
  400: (message) =>
    badRequestError(resolveMappedStatusMessage(message, AppErrorCodes.badRequest, 'Request failed')),
  
  // 401 Unauthorized - Authentication is required and has failed or not been provided
  401: (message) =>
    authError(resolveMappedStatusMessage(message, AppErrorCodes.unauthorized, 'Unauthorized')),
  
  // 403 Forbidden - Server understood request but refuses to authorize it
  403: (message) =>
    forbiddenError(resolveMappedStatusMessage(message, AppErrorCodes.forbidden, 'Forbidden')),
  
  // 404 Not Found - Server cannot find the requested resource
  404: (message) =>
    notFoundError(resolveMappedStatusMessage(message, AppErrorCodes.notFound, 'Not found')),
  
  // 409 Conflict - Request conflicts with current state of the server
  409: (message) =>
    conflictError(resolveMappedStatusMessage(message, AppErrorCodes.conflict, 'Conflict')),
  
  // 422 Unprocessable Entity - Request is well-formed but semantically incorrect
  422: (message) =>
    unprocessableEntityError(
      resolveMappedStatusMessage(message, AppErrorCodes.unprocessableEntity, 'Unprocessable entity')
    ),
  
  // 429 Too Many Requests - User has sent too many requests in a given time period
  429: (message, options) =>
    rateLimitedError(
      resolveMappedStatusMessage(message, AppErrorCodes.rateLimited, 'Too many requests'),
      options?.retryAfterMs
    ),
  
  // 503 Service Unavailable - Server is temporarily unable to handle the request
  503: (message, options) =>
    serviceUnavailableError(
      resolveMappedStatusMessage(
        message,
        AppErrorCodes.serviceUnavailable,
        'Service temporarily unavailable'
      ),
      options?.retryAfterMs
    ),
  
  // 504 Gateway Timeout - Server acting as gateway did not receive timely response
  504: (message) =>
    timeoutError(resolveMappedStatusMessage(message, AppErrorCodes.timeout, 'Operation timed out')),
};

/**
 * Maps HTTP status codes to appropriate AppError instances.
 * 
 * @param message - Error message to include in the AppError
 * @param status - HTTP status code to map
 * @param options - Additional options like retry delay
 * @returns AppError instance with appropriate error code and status
 * 
 * Handles:
 * - Known status codes (400, 401, 403, 404, 409, 422, 429, 503, 504)
 * - 5xx errors as external service errors
 * - 4xx errors as bad request errors
 * - Unknown status codes as internal errors
 */
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
  
  // 5xx status codes - Server errors from external services
  if (status >= 500) {
    return externalServiceError(
      resolveMappedStatusMessage(message, AppErrorCodes.externalService, 'External service error'),
      { status }
    );
  }
  
  // 4xx status codes - Client errors not explicitly mapped
  if (status >= 400) {
    return createAppError(msg, {
      code: AppErrorCodes.badRequest,
      httpStatus: status,
      expected: true,
    });
  }
  
  // Unexpected status codes - Treat as internal error
  return createAppError(msg, {
    code: AppErrorCodes.internal,
    httpStatus: 500,
    expected: false,
  });
};

/**
 * Network error codes that indicate connectivity issues.
 * These errors are typically retryable and indicate problems with network connections.
 */
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',  // Connection refused - target server is not accepting connections
  'ECONNRESET',    // Connection reset by peer - connection was forcibly closed
  'EAI_AGAIN',     // DNS lookup timed out - temporary DNS resolution failure
  'ENOTFOUND',     // DNS lookup failed - hostname cannot be resolved
  'ETIMEDOUT',     // Connection timed out - no response within timeout period
  'ECONNABORTED',  // Connection aborted - connection was terminated by local system
]);

const resolveRetryAfterMs = (error: {
  retryAfterMs?: number;
  retryAfter?: number;
}): number | undefined => {
  if (typeof error.retryAfterMs === 'number') return error.retryAfterMs;
  if (typeof error.retryAfter === 'number') return error.retryAfter * 1000;
  return undefined;
};

const resolveErrorStatus = (error: { status?: number; statusCode?: number }): number | null => {
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  return null;
};

/**
 * Attempts to map an unknown error to an AppError instance.
 * 
 * @param error - Unknown error object to map
 * @param fallbackMessage - Message to use if error doesn't have one
 * @returns AppError instance if mapping is successful, null otherwise
 * 
 * Handles:
 * - Already-wrapped AppError instances (returns as-is)
 * - HTTP status code errors (401, 404, 500, etc.)
 * - AbortError (request cancellation/timeout)
 * - MongoDB errors (duplicate keys, validation, connection issues)
 * - Network errors (DNS, connection failures)
 * - JSON parsing errors
 */
export const mapErrorToAppError = (error: unknown, fallbackMessage?: string): AppError | null => {
  // Already an AppError - return as-is
  if (isAppError(error)) return error;

  if (error !== null && error !== undefined && typeof error === 'object') {
    const err = error as {
      name?: string;
      message?: string;
      status?: number;
      statusCode?: number;
      code?: string | number;
      retryAfterMs?: number;
      retryAfter?: number;
    };

    // Extract HTTP status code from error object
    const status = resolveErrorStatus(err);

    // Map HTTP status codes to appropriate AppError types
    if (status !== null) {
      const retryAfterMs = resolveRetryAfterMs(err);
      return mapStatusToAppError(err.message ?? fallbackMessage ?? 'Request failed', status, {
        ...(typeof retryAfterMs === 'number' ? { retryAfterMs } : {}),
      });
    }

    // Handle request abortion/cancellation errors
    if (err.name === 'AbortError') {
      return timeoutError(
        fallbackMessage ??
          resolveErrorCatalogMessage(AppErrorCodes.timeout, 'Operation timed out')
      );
    }

    // Handle MongoDB-specific errors by name pattern
    if (err.name?.toLowerCase().includes('mongo') === true) {
      const codeNumber = typeof err.code === 'number' ? err.code : Number(err.code);
      const message = err.message ?? '';

      if (isLocalDatabaseConnectionRefused(error)) {
        return createAppError(LOCAL_DATABASE_SERVER_UNAVAILABLE_MESSAGE, {
          code: AppErrorCodes.databaseError,
          httpStatus: 503,
          cause: error,
          expected: true,
          critical: true,
          retryable: true,
          retryAfterMs: 5000,
        });
      }

      // MongoDB Error 11000 - Duplicate key error (unique constraint violation)
      if (codeNumber === 11000 || message.includes('E11000') || message.includes('duplicate key')) {
        return conflictError('Duplicate entry', {
          mongoCode: err.code,
        });
      }
      
      // MongoDB Error 121 - Document validation failed (schema validation error)
      if (codeNumber === 121) {
        return unprocessableEntityError('Document validation failed', {
          mongoCode: err.code,
        });
      }
      
      // MongoDB network/connection errors - Cannot reach database server
      if (err.name.includes('Network') || err.name.includes('ServerSelection')) {
        return databaseError('Database connection failed', error);
      }
      
      // MongoDB timeout errors - Operation exceeded time limit
      if (err.name.includes('Timeout') || message.toLowerCase().includes('timed out')) {
        return timeoutError(
          resolveErrorCatalogMessage(AppErrorCodes.timeout, 'Database operation timed out'),
          { mongoCode: err.code }
        );
      }
      
      // Generic MongoDB error - Catch-all for other database errors
      return databaseError(fallbackMessage ?? 'Database operation failed', error, {
        mongoCode: err.code,
      });
    }

    // Handle network connectivity errors (DNS, connection failures, timeouts)
    if (typeof err.code === 'string' && NETWORK_ERROR_CODES.has(err.code)) {
      return externalServiceError(
        fallbackMessage ??
          resolveErrorCatalogMessage(AppErrorCodes.externalService, 'Network error'),
        { code: err.code },
        { retryable: true }
      );
    }

    // Handle JSON parsing errors - Invalid JSON in request body
    if (err.name === 'SyntaxError' && (err.message ?? '').includes('JSON')) {
      return badRequestError('Invalid JSON payload');
    }
  }

  return null;
};
