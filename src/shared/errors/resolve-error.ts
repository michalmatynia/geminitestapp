import 'server-only';

import { randomUUID } from 'crypto';

import { z } from 'zod';

import {
  ERROR_CATEGORY,
  type ErrorCategory,
  type SuggestedAction,
} from '@/shared/contracts/observability';
import {
  AppErrorCodes,
  internalError,
  isAppError,
  type AppErrorCode,
} from '@/shared/errors/app-error';
import { classifyError, getSuggestedActions } from '@/shared/errors/error-classifier';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';

export type ResolvedError = {
  errorId: string;
  message: string;
  code: AppErrorCode;
  httpStatus: number;
  expected: boolean;
  critical: boolean;
  retryable: boolean;
  category: ErrorCategory;
  suggestedActions: SuggestedAction[];
  retryAfterMs?: number;
  meta?: Record<string, unknown>;
  cause?: unknown;
};

type ResolveOptions = {
  fallbackMessage?: string;
};

/**
 * Resolves any error type into a standardized ResolvedError structure.
 * Handles AppError, ZodError, and unknown errors.
 */
export const resolveError = (error: unknown, options?: ResolveOptions): ResolvedError => {
  const errorId = randomUUID();
  const category = classifyError(error);
  const suggestedActions = getSuggestedActions(category, error);

  const toResolved = (appError: {
    message: string;
    code: AppErrorCode;
    httpStatus: number;
    expected: boolean;
    critical: boolean;
    retryable: boolean;
    retryAfterMs?: number | undefined;
    meta?: Record<string, unknown>;
    cause?: unknown;
  }): ResolvedError => ({
    errorId,
    message: appError.message,
    code: appError.code,
    httpStatus: appError.httpStatus,
    expected: appError.expected,
    critical: appError.critical,
    retryable: appError.retryable,
    category,
    suggestedActions,
    ...(typeof appError.retryAfterMs === 'number' ? { retryAfterMs: appError.retryAfterMs } : {}),
    ...(appError.meta ? { meta: appError.meta } : {}),
    cause: appError.cause,
  });

  if (isAppError(error)) {
    return toResolved(error);
  }

  const mapped = mapErrorToAppError(error, options?.fallbackMessage);
  if (mapped) {
    return toResolved(mapped);
  }

  if (error instanceof z.ZodError) {
    return {
      errorId,
      message: 'Invalid request payload',
      code: AppErrorCodes.validation,
      httpStatus: 400,
      expected: true,
      critical: false,
      retryable: false,
      category,
      suggestedActions,
      meta: { issues: error.flatten() },
      cause: error,
    };
  }

  // Handle database client errors
  if (isDatabaseClientError(error)) {
    return resolveDatabaseClientError(error, errorId, options);
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      errorId,
      message: 'Network request failed',
      code: AppErrorCodes.externalService,
      httpStatus: 502,
      expected: false,
      critical: false,
      retryable: true,
      category,
      suggestedActions,
      cause: error,
    };
  }

  const fallback = options?.fallbackMessage ?? 'Unexpected error occurred';
  const internal = internalError(fallback);
  return {
    errorId,
    message: internal.message,
    code: internal.code,
    httpStatus: internal.httpStatus,
    expected: internal.expected,
    critical: internal.critical,
    retryable: internal.retryable,
    category,
    suggestedActions,
    ...(internal.meta ? { meta: internal.meta } : {}),
    cause: error,
  };
};

/**
 * Check if error comes from a database client or transport layer.
 */
function isDatabaseClientError(error: unknown): error is Error & { code?: string } {
  if (!(error instanceof Error)) {
    return false;
  }

  const constructorName = error.constructor.name;
  return (
    constructorName === 'MongoServerError' ||
    constructorName === 'MongoNetworkError' ||
    constructorName === 'MongoBulkWriteError' ||
    constructorName === 'ValidationError' ||
    ('code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (((error as { code: string }).code.startsWith('P') &&
        (error as { code: string }).code.length >= 4) ||
        (error as { code: string }).code.includes('ECONN')))
  );
}

/**
 * Resolves database client errors into the canonical app error surface.
 */
function resolveDatabaseClientError(
  error: Error & { code?: string },
  errorId: string,
  options?: ResolveOptions
): ResolvedError {
  const code = error.code;

  // Unique constraint violation
  if (code === 'P2002') {
    return {
      errorId,
      message: 'A record with this value already exists',
      code: AppErrorCodes.duplicateEntry,
      httpStatus: 409,
      expected: true,
      critical: false,
      retryable: false,
      category: ERROR_CATEGORY.DATABASE,
      suggestedActions: [
        {
          label: 'Contact Support',
          description:
            'This is a duplicate entry. Contact support if you believe this is an error.',
          actionType: 'CONTACT_SUPPORT',
        },
      ],
      meta: { databaseCode: code },
      cause: error,
    };
  }

  // Record not found
  if (code === 'P2001' || code === 'P2025') {
    return {
      errorId,
      message: 'Record not found',
      code: AppErrorCodes.notFound,
      httpStatus: 404,
      expected: true,
      critical: false,
      retryable: false,
      category: ERROR_CATEGORY.DATABASE,
      suggestedActions: [
        {
          label: 'Verify Input Data',
          description: 'The record was not found. Check the provided ID or data.',
          actionType: 'VERIFY_INPUT_DATA',
        },
      ],
      meta: { databaseCode: code },
      cause: error,
    };
  }

  // Foreign key constraint
  if (code === 'P2003') {
    return {
      errorId,
      message: 'Referenced record not found',
      code: AppErrorCodes.badRequest,
      httpStatus: 400,
      expected: true,
      critical: false,
      retryable: false,
      category: ERROR_CATEGORY.DATABASE,
      suggestedActions: [
        {
          label: 'Verify Input Data',
          description: 'A referenced record was not found. Check the provided IDs or data.',
          actionType: 'VERIFY_INPUT_DATA',
        },
      ],
      meta: { databaseCode: code },
      cause: error,
    };
  }

  // Connection errors
  if (code === 'P1001' || code === 'P1002' || code?.includes('ECONN')) {
    return {
      errorId,
      message: 'Database connection failed',
      code: AppErrorCodes.databaseError,
      httpStatus: 503,
      expected: false,
      critical: true,
      retryable: true,
      retryAfterMs: 5000,
      category: ERROR_CATEGORY.DATABASE,
      suggestedActions: [
        {
          label: 'Retry Later',
          description: 'The database connection failed. Please try again later.',
          actionType: 'RETRY',
        },
        {
          label: 'Check DB Connection',
          description: 'Verify your database connection string and credentials.',
          actionType: 'CHECK_CONFIG',
        },
      ],
      meta: { databaseCode: code },
      cause: error,
    };
  }

  // Timeout
  if (code === 'P1008' || code === 'P2024') {
    return {
      errorId,
      message: 'Database operation timed out',
      code: AppErrorCodes.timeout,
      httpStatus: 504,
      expected: false,
      critical: false,
      retryable: true,
      category: ERROR_CATEGORY.DATABASE,
      suggestedActions: [
        {
          label: 'Retry Later',
          description: 'The database operation timed out. Please try again later.',
          actionType: 'RETRY',
        },
        {
          label: 'Check Server Load',
          description: 'The server may be overloaded. Check server logs and resource utilization.',
          actionType: 'CHECK_SERVER_LOAD',
        },
      ],
      meta: { databaseCode: code },
      cause: error,
    };
  }

  // Validation errors from the active database client.
  if (error.constructor.name === 'ValidationError') {
    return {
      errorId,
      message: 'Invalid request payload',
      code: AppErrorCodes.validation,
      httpStatus: 400,
      expected: true,
      critical: false,
      retryable: false,
      category: ERROR_CATEGORY.VALIDATION,
      suggestedActions: [
        {
          label: 'Check Input',
          description: 'Please review the request payload and ensure all fields use valid values.',
          actionType: 'VERIFY_INPUT_DATA',
        },
      ],
      ...(code ? { meta: { databaseCode: code } } : {}),
      cause: error,
    };
  }

  // Generic database error
  return {
    errorId,
    message: options?.fallbackMessage ?? 'Database operation failed',
    code: AppErrorCodes.databaseError,
    httpStatus: 500,
    expected: false,
    critical: true,
    retryable: false,
    category: ERROR_CATEGORY.DATABASE,
    suggestedActions: [
      {
        label: 'Contact Support',
        description: 'An unexpected database error occurred. Please contact support.',
        actionType: 'CONTACT_SUPPORT',
      },
      {
        label: 'Check Server Logs',
        description: 'Review server logs for more details about the database error.',
        actionType: 'CHECK_SERVER_LOGS',
      },
    ],
    ...(code ? { meta: { databaseCode: code } } : {}),
    cause: error,
  };
}

/**
 * Creates a user-friendly error message from a resolved error.
 */
export const getUserMessage = (resolved: ResolvedError): string => {
  if (resolved.expected) {
    return resolved.message;
  }
  // For unexpected errors, return a generic message
  return 'An unexpected error occurred. Please try again later.';
};

/**
 * Determines if an error should be reported/alerted.
 */
export const shouldReport = (resolved: ResolvedError): boolean => {
  return resolved.critical || !resolved.expected;
};
