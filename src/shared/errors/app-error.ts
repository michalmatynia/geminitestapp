// Consolidated core types for the application
export type AppErrorCode = string;

export type AppErrorOptions = {
  code: string;
  httpStatus: number;
  meta?: Record<string, unknown> | undefined;
  expected?: boolean | undefined;
  critical?: boolean | undefined;
  retryable?: boolean | undefined;
  retryAfterMs?: number | undefined;
  cause?: unknown;
};

export const AppErrorCodes = {
  // Client Errors
  badRequest: 'BAD_REQUEST',
  validation: 'VALIDATION_ERROR',
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  rateLimited: 'RATE_LIMITED',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  unprocessableEntity: 'UNPROCESSABLE_ENTITY',
  methodNotAllowed: 'METHOD_NOT_ALLOWED',
  resourceLocked: 'RESOURCE_LOCKED',
  quotaExceeded: 'QUOTA_EXCEEDED',
  
  // Server Errors
  internal: 'INTERNAL_SERVER_ERROR',
  externalService: 'EXTERNAL_SERVICE_ERROR',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  timeout: 'TIMEOUT',
  databaseError: 'DATABASE_ERROR',
  configurationError: 'CONFIGURATION_ERROR',
  
  // Domain Errors
  duplicateEntry: 'DUPLICATE_ENTRY',
  invalidState: 'INVALID_STATE',
  operationFailed: 'OPERATION_FAILED',
  integrationError: 'INTEGRATION_ERROR',
  apiKeyInvalid: 'API_KEY_INVALID',
  webhookFailed: 'WEBHOOK_FAILED',
  
  // Legacy support
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export class AppError extends Error {
  code: AppErrorCode;
  httpStatus: number;
  meta?: Record<string, unknown>;
  expected: boolean;
  critical: boolean;
  retryable: boolean;
  retryAfterMs?: number | undefined;
  override cause?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    if (options.meta !== undefined) {
      this.meta = options.meta;
    }
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
      ...(this.meta !== undefined ? { meta: this.meta } : {}),
      expected: this.expected,
      critical: this.critical,
      retryable: this.retryable,
      ...(this.retryAfterMs !== undefined && { retryAfterMs: this.retryAfterMs }),
    });
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

export const createAppError = (message: string, options: AppErrorOptions): AppError =>
  new AppError(message, options);

// ============================================================================
// Client Errors (4xx)
// ============================================================================

export const validationError = (
  message: string,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.validation,
    httpStatus: 400,
    meta,
    expected: true,
  });

export const authError = (
  message: string = 'Unauthorized',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.unauthorized,
    httpStatus: 401,
    meta,
    expected: true,
  });

export const forbiddenError = (
  message: string = 'Forbidden',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.forbidden,
    httpStatus: 403,
    meta,
    expected: true,
  });

export const notFoundError = (
  message: string = 'Not found',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.notFound,
    httpStatus: 404,
    meta,
    expected: true,
  });

export const conflictError = (
  message: string = 'Conflict',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.conflict,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const badRequestError = (
  message: string = 'Bad request',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.badRequest,
    httpStatus: 400,
    meta,
    expected: true,
  });

export const rateLimitedError = (
  message: string = 'Too many requests',
  retryAfterMs?: number,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.rateLimited,
    httpStatus: 429,
    meta,
    expected: true,
    retryable: true,
    ...(retryAfterMs !== undefined && { retryAfterMs }),
  });

export const payloadTooLargeError = (
  message: string = 'Payload too large',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.payloadTooLarge,
    httpStatus: 413,
    meta,
    expected: true,
  });

export const unprocessableEntityError = (
  message: string = 'Unprocessable entity',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.unprocessableEntity,
    httpStatus: 422,
    meta,
    expected: true,
  });

export const methodNotAllowedError = (
  message: string = 'Method not allowed',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.methodNotAllowed,
    httpStatus: 405,
    meta,
    expected: true,
  });

// ============================================================================
// Server Errors (5xx)
// ============================================================================

export const internalError = (
  message: string = 'Unexpected error occurred',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.internal,
    httpStatus: 500,
    meta,
    expected: false,
    critical: true,
  });

export const externalServiceError = (
  message: string = 'External service error',
  meta?: Record<string, unknown>,
  options?: { retryable?: boolean; retryAfterMs?: number }
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.externalService,
    httpStatus: 502,
    meta,
    expected: false,
    retryable: options?.retryable ?? true,
    ...(options?.retryAfterMs !== undefined && { retryAfterMs: options.retryAfterMs }),
  });

export const serviceUnavailableError = (
  message: string = 'Service temporarily unavailable',
  retryAfterMs?: number,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.serviceUnavailable,
    httpStatus: 503,
    meta,
    expected: false,
    retryable: true,
    ...(retryAfterMs !== undefined && { retryAfterMs }),
  });

export const timeoutError = (
  message: string = 'Operation timed out',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.timeout,
    httpStatus: 504,
    meta,
    expected: false,
    retryable: true,
  });

export const databaseError = (
  message: string = 'Database operation failed',
  cause?: unknown,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.databaseError,
    httpStatus: 500,
    cause,
    meta,
    expected: false,
    critical: true,
  });

export const configurationError = (
  message: string = 'Server configuration error',
  meta?: Record<string, unknown>
): AppError =>
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
  message: string = 'Duplicate entry',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.duplicateEntry,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const invalidStateError = (
  message: string = 'Invalid state for this operation',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.invalidState,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const operationFailedError = (
  message: string = 'Operation failed',
  cause?: unknown,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.operationFailed,
    httpStatus: 500,
    cause,
    meta,
    expected: false,
  });

export const resourceLockedError = (
  message: string = 'Resource is locked',
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.resourceLocked,
    httpStatus: 423,
    meta,
    expected: true,
    retryable: true,
    retryAfterMs: 5000,
  });

export const quotaExceededError = (
  message: string = 'Quota exceeded',
  meta?: Record<string, unknown>
): AppError =>
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
  message: string = 'Integration error',
  integrationName?: string,
  cause?: unknown,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.integrationError,
    httpStatus: 502,
    cause,
    meta: { ...meta, integration: integrationName },
    expected: false,
    retryable: true,
  });

export const apiKeyInvalidError = (
  message: string = 'Invalid or expired API key',
  integrationName?: string,
  meta?: Record<string, unknown>
): AppError =>
  new AppError(message, {
    code: AppErrorCodes.apiKeyInvalid,
    httpStatus: 401,
    meta: { ...meta, integration: integrationName },
    expected: true,
  });

export const webhookFailedError = (
  message: string = 'Webhook delivery failed',
  meta?: Record<string, unknown>
): AppError =>
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
  fallbackMessage: string = 'An error occurred'
): AppError => {
  if (isAppError(error)) return error;

  const message: string =
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
