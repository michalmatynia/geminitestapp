export const AppErrorCodes = {
  // Client errors (4xx)
  validation: 'VALIDATION_ERROR',
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  badRequest: 'BAD_REQUEST',
  rateLimited: 'RATE_LIMITED',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  unsupportedMediaType: 'UNSUPPORTED_MEDIA_TYPE',
  unprocessableEntity: 'UNPROCESSABLE_ENTITY',

  // Server errors (5xx)
  internal: 'INTERNAL_ERROR',
  externalService: 'EXTERNAL_SERVICE_ERROR',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  timeout: 'TIMEOUT_ERROR',
  databaseError: 'DATABASE_ERROR',
  configurationError: 'CONFIGURATION_ERROR',

  // Domain-specific errors
  skuExists: 'SKU_EXISTS',
  duplicateEntry: 'DUPLICATE_ENTRY',
  invalidState: 'INVALID_STATE',
  operationFailed: 'OPERATION_FAILED',
  resourceLocked: 'RESOURCE_LOCKED',
  quotaExceeded: 'QUOTA_EXCEEDED',

  // Integration errors
  integrationError: 'INTEGRATION_ERROR',
  apiKeyInvalid: 'API_KEY_INVALID',
  webhookFailed: 'WEBHOOK_FAILED',
} as const;

export type AppErrorCode =
  | (typeof AppErrorCodes)[keyof typeof AppErrorCodes]
  | (string & {});

export type AppErrorOptions = {
  code: AppErrorCode;
  httpStatus: number;
  cause?: unknown;
  meta?: Record<string, unknown> | undefined;
  expected?: boolean;
  /** Whether this error should trigger alerts/notifications */
  critical?: boolean;
  /** Retry hint for clients */
  retryable?: boolean;
  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number;
};

export type ResolvedError = {
  message: string;
  code: string;
  status: number;
  details?: unknown;
};

export type MapStatusOptions = {
  defaultStatus?: number;
  fallbackCode?: string;
};

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  timestamp: string;
}

export type ClientErrorPayload = {
  message: string;
  stack?: string;
  url?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
};