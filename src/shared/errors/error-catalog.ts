/**
 * Error Catalog
 * 
 * Centralized catalog of application error definitions.
 * Provides:
 * - Error code to message mapping
 * - User-facing error messages
 * - Operator-facing error messages
 * - Error catalog entry definitions
 * - Standardized error documentation
 */

import type { ResolvedError } from '@/shared/contracts/base';

import { AppErrorCodes, type AppErrorCode } from '@/shared/errors/app-error';

export type ErrorCatalogEntry = {
  code: AppErrorCode;
  message: string;
  userMessage: string;
  operatorMessage?: string;
};

const DEFAULT_UNEXPECTED_MESSAGE =
  'An unexpected error occurred. Please try again later.';

const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  // Client Errors (4xx) - Issues with the request
  [AppErrorCodes.badRequest]: {
    code: AppErrorCodes.badRequest,
    // Occurs when the request is malformed or missing required fields
    message: 'Request validation failed',
    userMessage: 'Some fields are invalid. Check your input and try again.',
  },
  [AppErrorCodes.validation]: {
    code: AppErrorCodes.validation,
    // Occurs when input data fails validation rules (e.g., email format, length constraints)
    message: 'Validation failed',
    userMessage: 'Please review the highlighted fields and try again.',
  },
  [AppErrorCodes.unauthorized]: {
    code: AppErrorCodes.unauthorized,
    // Occurs when user is not authenticated or session has expired
    message: 'Authentication required',
    userMessage: 'Your session has expired. Log in again to continue.',
  },
  [AppErrorCodes.forbidden]: {
    code: AppErrorCodes.forbidden,
    // Occurs when user lacks required permissions for the requested action
    message: 'Access denied',
    userMessage: 'You don\'t have permission to do that.',
  },
  [AppErrorCodes.notFound]: {
    code: AppErrorCodes.notFound,
    // Occurs when requested resource doesn't exist (e.g., deleted item, invalid ID)
    message: 'Resource not found',
    userMessage: 'We could not find what you were looking for.',
  },
  [AppErrorCodes.conflict]: {
    code: AppErrorCodes.conflict,
    // Occurs when request conflicts with current state (e.g., concurrent modifications)
    message: 'Conflict with existing data',
    userMessage: 'This change conflicts with existing data. Refresh and try again.',
  },
  [AppErrorCodes.rateLimited]: {
    code: AppErrorCodes.rateLimited,
    // Occurs when user exceeds API rate limits (too many requests in short time)
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment and try again.',
  },
  [AppErrorCodes.payloadTooLarge]: {
    code: AppErrorCodes.payloadTooLarge,
    // Occurs when request body exceeds maximum allowed size
    message: 'Payload exceeds size limit',
    userMessage: 'The uploaded file is too large. Reduce the size and try again.',
  },
  [AppErrorCodes.unprocessableEntity]: {
    code: AppErrorCodes.unprocessableEntity,
    // Occurs when request is syntactically correct but semantically invalid
    message: 'Request cannot be processed',
    userMessage: 'We could not process this request. Check the data and try again.',
  },
  [AppErrorCodes.methodNotAllowed]: {
    code: AppErrorCodes.methodNotAllowed,
    // Occurs when HTTP method (GET, POST, etc.) is not supported for the endpoint
    message: 'Method not allowed',
    userMessage: 'This action is not supported.',
  },
  [AppErrorCodes.resourceLocked]: {
    code: AppErrorCodes.resourceLocked,
    // Occurs when resource is temporarily locked (e.g., being edited by another user)
    message: 'Resource is locked',
    userMessage: 'This item is locked. Try again shortly.',
  },
  [AppErrorCodes.quotaExceeded]: {
    code: AppErrorCodes.quotaExceeded,
    // Occurs when user has exceeded usage limits (storage, API calls, etc.)
    message: 'Quota exceeded',
    userMessage: 'You have reached the usage limit. Try later or upgrade.',
  },

  // Server Errors (5xx) - Internal system issues
  [AppErrorCodes.internal]: {
    code: AppErrorCodes.internal,
    // Occurs when an unexpected error happens on the server (catch-all for unhandled errors)
    message: 'Unexpected server error',
    userMessage: DEFAULT_UNEXPECTED_MESSAGE,
  },
  [AppErrorCodes.externalService]: {
    code: AppErrorCodes.externalService,
    // Occurs when a third-party service (API, payment gateway, etc.) fails or doesn't respond
    message: 'Upstream service error',
    userMessage: 'A connected service did not respond. Try again shortly.',
  },
  [AppErrorCodes.serviceUnavailable]: {
    code: AppErrorCodes.serviceUnavailable,
    // Occurs when the service is temporarily down for maintenance or overloaded
    message: 'Service temporarily unavailable',
    userMessage: 'Service is temporarily unavailable. Please try again later.',
  },
  [AppErrorCodes.timeout]: {
    code: AppErrorCodes.timeout,
    // Occurs when an operation takes longer than the allowed timeout period
    message: 'Operation timed out',
    userMessage: 'The request took too long. Please retry.',
  },
  [AppErrorCodes.databaseError]: {
    code: AppErrorCodes.databaseError,
    // Occurs when database operations fail (connection issues, query errors, etc.)
    message: 'Database operation failed',
    userMessage: 'We ran into a database issue. Please try again.',
  },
  [AppErrorCodes.configurationError]: {
    code: AppErrorCodes.configurationError,
    // Occurs when server configuration is missing or invalid (environment variables, settings)
    message: 'Server configuration error',
    userMessage: 'A configuration error occurred. Please contact support.',
  },

  // Domain-Specific Errors
  [AppErrorCodes.duplicateEntry]: {
    code: AppErrorCodes.duplicateEntry,
    // Occurs when trying to create a resource that already exists (unique constraint violation)
    message: 'Duplicate entry',
    userMessage: 'This item already exists.',
  },
  [AppErrorCodes.invalidState]: {
    code: AppErrorCodes.invalidState,
    // Occurs when operation cannot be performed in the current state (e.g., can't delete published item)
    message: 'Invalid state for operation',
    userMessage: 'This action isn\'t available right now.',
  },
  [AppErrorCodes.operationFailed]: {
    code: AppErrorCodes.operationFailed,
    // Occurs when a business operation fails for domain-specific reasons
    message: 'Operation failed',
    userMessage: 'The operation failed. Please try again.',
  },
  [AppErrorCodes.integrationError]: {
    code: AppErrorCodes.integrationError,
    // Occurs when integration with external systems fails (webhooks, connectors, etc.)
    message: 'Integration error',
    userMessage: 'The integration failed. Check the connection and try again.',
  },
  [AppErrorCodes.apiKeyInvalid]: {
    code: AppErrorCodes.apiKeyInvalid,
    // Occurs when API key is missing, invalid, or has expired
    message: 'Invalid API key',
    userMessage: 'The API key is invalid or expired.',
  },
  [AppErrorCodes.webhookFailed]: {
    code: AppErrorCodes.webhookFailed,
    // Occurs when webhook delivery fails (will be retried automatically)
    message: 'Webhook delivery failed',
    userMessage: 'Webhook delivery failed. We will retry automatically.',
  },
};

const DEFAULT_APP_ERROR_MESSAGES: Record<string, string> = {
  // Client Errors (4xx)
  [AppErrorCodes.badRequest]: 'Bad request', // Malformed or invalid request structure
  [AppErrorCodes.validation]: 'Validation failed', // Input data doesn't meet validation rules
  [AppErrorCodes.unauthorized]: 'Unauthorized', // User not authenticated or session expired
  [AppErrorCodes.forbidden]: 'Forbidden', // User lacks required permissions
  [AppErrorCodes.notFound]: 'Not found', // Requested resource doesn't exist
  [AppErrorCodes.conflict]: 'Conflict', // Request conflicts with current resource state
  [AppErrorCodes.rateLimited]: 'Too many requests', // API rate limit exceeded
  [AppErrorCodes.payloadTooLarge]: 'Payload too large', // Request body exceeds size limit
  [AppErrorCodes.unprocessableEntity]: 'Unprocessable entity', // Semantically invalid request
  [AppErrorCodes.methodNotAllowed]: 'Method not allowed', // HTTP method not supported for endpoint
  [AppErrorCodes.resourceLocked]: 'Resource is locked', // Resource temporarily unavailable for modification
  [AppErrorCodes.quotaExceeded]: 'Quota exceeded', // User has exceeded usage limits

  // Server Errors (5xx)
  [AppErrorCodes.internal]: 'Unexpected error occurred', // Unhandled server error
  [AppErrorCodes.externalService]: 'External service error', // Third-party service failure
  [AppErrorCodes.serviceUnavailable]: 'Service temporarily unavailable', // Server maintenance or overload
  [AppErrorCodes.timeout]: 'Operation timed out', // Request exceeded timeout threshold
  [AppErrorCodes.databaseError]: 'Database operation failed', // Database connection or query error
  [AppErrorCodes.configurationError]: 'Server configuration error', // Missing or invalid configuration

  // Domain-Specific Errors
  [AppErrorCodes.duplicateEntry]: 'Duplicate entry', // Unique constraint violation
  [AppErrorCodes.invalidState]: 'Invalid state for this operation', // Operation not allowed in current state
  [AppErrorCodes.operationFailed]: 'Operation failed', // Business logic operation failed
  [AppErrorCodes.integrationError]: 'Integration error', // External system integration failed
  [AppErrorCodes.apiKeyInvalid]: 'Invalid or expired API key', // API authentication failed
  [AppErrorCodes.webhookFailed]: 'Webhook delivery failed', // Webhook delivery attempt failed
};

const normalizeMessage = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const getErrorCatalogEntry = (code: string): ErrorCatalogEntry | null =>
  ERROR_CATALOG[code] ?? null;

export const getDefaultAppErrorMessage = (code: string): string | null =>
  DEFAULT_APP_ERROR_MESSAGES[code] ?? null;

export const resolveErrorCatalogMessage = (code: string, fallback: string): string =>
  getErrorCatalogEntry(code)?.message ?? fallback;

export const resolveErrorCatalogUserMessage = (code: string, fallback: string): string =>
  getErrorCatalogEntry(code)?.userMessage ?? fallback;

export const isDefaultAppErrorMessage = (code: string, message: string | null | undefined): boolean => {
  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) return false;
  const defaultMessage = normalizeMessage(getDefaultAppErrorMessage(code));
  const catalogMessage = normalizeMessage(getErrorCatalogEntry(code)?.message);
  return normalizedMessage === defaultMessage || normalizedMessage === catalogMessage;
};

export const resolveErrorUserMessage = (resolved: ResolvedError): string => {
  const entry = getErrorCatalogEntry(resolved.code);
  if (!entry) {
    return resolved.expected ? resolved.message : DEFAULT_UNEXPECTED_MESSAGE;
  }

  if (resolved.expected && resolved.message && !isDefaultAppErrorMessage(resolved.code, resolved.message)) {
    return resolved.message;
  }

  return entry.userMessage || DEFAULT_UNEXPECTED_MESSAGE;
};

export const resolveErrorLogMessage = (resolved: ResolvedError): string => {
  const entry = getErrorCatalogEntry(resolved.code);
  if (!entry) return resolved.message;

  if (resolved.message && !isDefaultAppErrorMessage(resolved.code, resolved.message)) {
    return resolved.message;
  }

  return entry.operatorMessage ?? entry.message ?? resolved.message;
};

export const resolveUnexpectedFallbackMessage = (): string =>
  getErrorCatalogEntry(AppErrorCodes.internal)?.message ?? 'Unexpected error occurred';
