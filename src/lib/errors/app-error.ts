import { AppErrorCode, AppErrorOptions, AppErrorCodes } from "@/types/errors";

export { AppErrorCodes };
export type { AppErrorCode, AppErrorOptions };

export class AppError extends Error {
  code: AppErrorCode;
  httpStatus: number;
  meta?: Record<string, unknown> | undefined;
  expected: boolean;
  critical: boolean;
  retryable: boolean;
  retryAfterMs?: number;
  override cause?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.meta = options.meta;
    this.expected = options.expected ?? true;
    this.critical = options.critical ?? false;
    this.retryable = options.retryable ?? false;
    if (options.retryAfterMs !== undefined) {
      this.retryAfterMs = options.retryAfterMs;
    }
    this.cause = options.cause;
  }

  /** Create a copy with additional metadata */
  withMeta(additionalMeta: Record<string, unknown>): AppError {
    return new AppError(this.message, {
      code: this.code,
      httpStatus: this.httpStatus,
      cause: this.cause,
      meta: { ...this.meta, ...additionalMeta },
      expected: this.expected,
      critical: this.critical,
      retryable: this.retryable,
      ...(this.retryAfterMs !== undefined && { retryAfterMs: this.retryAfterMs }),
    });
  }

  /** Create a copy with a different message */
  withMessage(newMessage: string): AppError {
    return new AppError(newMessage, {
      code: this.code,
      httpStatus: this.httpStatus,
      cause: this.cause,
      meta: this.meta,
      expected: this.expected,
      critical: this.critical,
      retryable: this.retryable,
      ...(this.retryAfterMs !== undefined && { retryAfterMs: this.retryAfterMs }),
    });
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

export const createAppError = (message: string, options: AppErrorOptions) =>
  new AppError(message, options);

// ============================================================================
// Client Errors (4xx)
// ============================================================================

export const validationError = (
  message: string,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.validation,
    httpStatus: 400,
    meta,
    expected: true,
  });

export const authError = (
  message = "Unauthorized",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.unauthorized,
    httpStatus: 401,
    meta,
    expected: true,
  });

export const forbiddenError = (
  message = "Forbidden",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.forbidden,
    httpStatus: 403,
    meta,
    expected: true,
  });

export const notFoundError = (
  message = "Not found",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.notFound,
    httpStatus: 404,
    meta,
    expected: true,
  });

export const conflictError = (
  message = "Conflict",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.conflict,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const badRequestError = (
  message = "Bad request",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.badRequest,
    httpStatus: 400,
    meta,
    expected: true,
  });

export const rateLimitedError = (
  message = "Too many requests",
  retryAfterMs?: number,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.rateLimited,
    httpStatus: 429,
    meta,
    expected: true,
    retryable: true,
    ...(retryAfterMs !== undefined && { retryAfterMs }),
  });

export const payloadTooLargeError = (
  message = "Payload too large",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.payloadTooLarge,
    httpStatus: 413,
    meta,
    expected: true,
  });

export const unprocessableEntityError = (
  message = "Unprocessable entity",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.unprocessableEntity,
    httpStatus: 422,
    meta,
    expected: true,
  });

// ============================================================================
// Server Errors (5xx)
// ============================================================================

export const internalError = (
  message = "Unexpected error occurred",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.internal,
    httpStatus: 500,
    meta,
    expected: false,
    critical: true,
  });

export const externalServiceError = (
  message = "External service error",
  meta?: Record<string, unknown>,
  options?: { retryable?: boolean; retryAfterMs?: number }
) =>
  new AppError(message, {
    code: AppErrorCodes.externalService,
    httpStatus: 502,
    meta,
    expected: false,
    retryable: options?.retryable ?? true,
    ...(options?.retryAfterMs !== undefined && { retryAfterMs: options.retryAfterMs }),
  });

export const serviceUnavailableError = (
  message = "Service temporarily unavailable",
  retryAfterMs?: number,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.serviceUnavailable,
    httpStatus: 503,
    meta,
    expected: false,
    retryable: true,
    ...(retryAfterMs !== undefined && { retryAfterMs }),
  });

export const timeoutError = (
  message = "Operation timed out",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.timeout,
    httpStatus: 504,
    meta,
    expected: false,
    retryable: true,
  });

export const databaseError = (
  message = "Database operation failed",
  cause?: unknown,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.databaseError,
    httpStatus: 500,
    cause,
    meta,
    expected: false,
    critical: true,
  });

export const configurationError = (
  message = "Server configuration error",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.configurationError,
    httpStatus: 500,
    meta,
    expected: false,
    critical: true,
  });

// ============================================================================
// Domain-Specific Errors
// ============================================================================

export const duplicateEntryError = (
  message = "Duplicate entry",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.duplicateEntry,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const invalidStateError = (
  message = "Invalid state for this operation",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.invalidState,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const operationFailedError = (
  message = "Operation failed",
  cause?: unknown,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.operationFailed,
    httpStatus: 500,
    cause,
    meta,
    expected: false,
  });

export const resourceLockedError = (
  message = "Resource is locked",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.resourceLocked,
    httpStatus: 423,
    meta,
    expected: true,
    retryable: true,
    retryAfterMs: 5000,
  });

export const quotaExceededError = (
  message = "Quota exceeded",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.quotaExceeded,
    httpStatus: 429,
    meta,
    expected: true,
  });

// ============================================================================
// Integration Errors
// ============================================================================

export const integrationError = (
  message = "Integration error",
  integrationName?: string,
  cause?: unknown,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.integrationError,
    httpStatus: 502,
    cause,
    meta: { ...meta, integration: integrationName },
    expected: false,
    retryable: true,
  });

export const apiKeyInvalidError = (
  message = "Invalid or expired API key",
  integrationName?: string,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.apiKeyInvalid,
    httpStatus: 401,
    meta: { ...meta, integration: integrationName },
    expected: true,
  });

export const webhookFailedError = (
  message = "Webhook delivery failed",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.webhookFailed,
    httpStatus: 502,
    meta,
    expected: false,
    retryable: true,
  });

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wraps an unknown error as an AppError, preserving AppError instances.
 */
export const wrapError = (
  error: unknown,
  fallbackMessage = "An error occurred"
): AppError => {
  if (isAppError(error)) return error;

  const message =
    error instanceof Error ? error.message : String(error) || fallbackMessage;

  return new AppError(message, {
    code: AppErrorCodes.internal,
    httpStatus: 500,
    cause: error,
    expected: false,
  });
};

/**
 * Checks if an error is retryable.
 */
export const isRetryableError = (error: unknown): boolean => {
  if (isAppError(error)) return error.retryable;
  return false;
};

/**
 * Gets the retry delay for an error, if applicable.
 */
export const getRetryDelay = (error: unknown): number | null => {
  if (isAppError(error) && error.retryable) {
    return error.retryAfterMs ?? null;
  }
  return null;
};

/**
 * Checks if an error is critical and should trigger alerts.
 */
export const isCriticalError = (error: unknown): boolean => {
  if (isAppError(error)) return error.critical;
  // Unknown errors are considered critical
  return true;
};
