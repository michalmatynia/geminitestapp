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
  [AppErrorCodes.badRequest]: {
    code: AppErrorCodes.badRequest,
    message: 'Request validation failed',
    userMessage: 'Some fields are invalid. Check your input and try again.',
  },
  [AppErrorCodes.validation]: {
    code: AppErrorCodes.validation,
    message: 'Validation failed',
    userMessage: 'Please review the highlighted fields and try again.',
  },
  [AppErrorCodes.unauthorized]: {
    code: AppErrorCodes.unauthorized,
    message: 'Authentication required',
    userMessage: 'Your session has expired. Log in again to continue.',
  },
  [AppErrorCodes.forbidden]: {
    code: AppErrorCodes.forbidden,
    message: 'Access denied',
    userMessage: 'You don\'t have permission to do that.',
  },
  [AppErrorCodes.notFound]: {
    code: AppErrorCodes.notFound,
    message: 'Resource not found',
    userMessage: 'We could not find what you were looking for.',
  },
  [AppErrorCodes.conflict]: {
    code: AppErrorCodes.conflict,
    message: 'Conflict with existing data',
    userMessage: 'This change conflicts with existing data. Refresh and try again.',
  },
  [AppErrorCodes.rateLimited]: {
    code: AppErrorCodes.rateLimited,
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment and try again.',
  },
  [AppErrorCodes.payloadTooLarge]: {
    code: AppErrorCodes.payloadTooLarge,
    message: 'Payload exceeds size limit',
    userMessage: 'The uploaded file is too large. Reduce the size and try again.',
  },
  [AppErrorCodes.unprocessableEntity]: {
    code: AppErrorCodes.unprocessableEntity,
    message: 'Request cannot be processed',
    userMessage: 'We could not process this request. Check the data and try again.',
  },
  [AppErrorCodes.methodNotAllowed]: {
    code: AppErrorCodes.methodNotAllowed,
    message: 'Method not allowed',
    userMessage: 'This action is not supported.',
  },
  [AppErrorCodes.resourceLocked]: {
    code: AppErrorCodes.resourceLocked,
    message: 'Resource is locked',
    userMessage: 'This item is locked. Try again shortly.',
  },
  [AppErrorCodes.quotaExceeded]: {
    code: AppErrorCodes.quotaExceeded,
    message: 'Quota exceeded',
    userMessage: 'You have reached the usage limit. Try later or upgrade.',
  },
  [AppErrorCodes.internal]: {
    code: AppErrorCodes.internal,
    message: 'Unexpected server error',
    userMessage: DEFAULT_UNEXPECTED_MESSAGE,
  },
  [AppErrorCodes.externalService]: {
    code: AppErrorCodes.externalService,
    message: 'Upstream service error',
    userMessage: 'A connected service did not respond. Try again shortly.',
  },
  [AppErrorCodes.serviceUnavailable]: {
    code: AppErrorCodes.serviceUnavailable,
    message: 'Service temporarily unavailable',
    userMessage: 'Service is temporarily unavailable. Please try again later.',
  },
  [AppErrorCodes.timeout]: {
    code: AppErrorCodes.timeout,
    message: 'Operation timed out',
    userMessage: 'The request took too long. Please retry.',
  },
  [AppErrorCodes.databaseError]: {
    code: AppErrorCodes.databaseError,
    message: 'Database operation failed',
    userMessage: 'We ran into a database issue. Please try again.',
  },
  [AppErrorCodes.configurationError]: {
    code: AppErrorCodes.configurationError,
    message: 'Server configuration error',
    userMessage: 'A configuration error occurred. Please contact support.',
  },
  [AppErrorCodes.duplicateEntry]: {
    code: AppErrorCodes.duplicateEntry,
    message: 'Duplicate entry',
    userMessage: 'This item already exists.',
  },
  [AppErrorCodes.invalidState]: {
    code: AppErrorCodes.invalidState,
    message: 'Invalid state for operation',
    userMessage: 'This action isn\'t available right now.',
  },
  [AppErrorCodes.operationFailed]: {
    code: AppErrorCodes.operationFailed,
    message: 'Operation failed',
    userMessage: 'The operation failed. Please try again.',
  },
  [AppErrorCodes.integrationError]: {
    code: AppErrorCodes.integrationError,
    message: 'Integration error',
    userMessage: 'The integration failed. Check the connection and try again.',
  },
  [AppErrorCodes.apiKeyInvalid]: {
    code: AppErrorCodes.apiKeyInvalid,
    message: 'Invalid API key',
    userMessage: 'The API key is invalid or expired.',
  },
  [AppErrorCodes.webhookFailed]: {
    code: AppErrorCodes.webhookFailed,
    message: 'Webhook delivery failed',
    userMessage: 'Webhook delivery failed. We will retry automatically.',
  },
};

const DEFAULT_APP_ERROR_MESSAGES: Record<string, string> = {
  [AppErrorCodes.badRequest]: 'Bad request',
  [AppErrorCodes.validation]: 'Validation failed',
  [AppErrorCodes.unauthorized]: 'Unauthorized',
  [AppErrorCodes.forbidden]: 'Forbidden',
  [AppErrorCodes.notFound]: 'Not found',
  [AppErrorCodes.conflict]: 'Conflict',
  [AppErrorCodes.rateLimited]: 'Too many requests',
  [AppErrorCodes.payloadTooLarge]: 'Payload too large',
  [AppErrorCodes.unprocessableEntity]: 'Unprocessable entity',
  [AppErrorCodes.methodNotAllowed]: 'Method not allowed',
  [AppErrorCodes.resourceLocked]: 'Resource is locked',
  [AppErrorCodes.quotaExceeded]: 'Quota exceeded',
  [AppErrorCodes.internal]: 'Unexpected error occurred',
  [AppErrorCodes.externalService]: 'External service error',
  [AppErrorCodes.serviceUnavailable]: 'Service temporarily unavailable',
  [AppErrorCodes.timeout]: 'Operation timed out',
  [AppErrorCodes.databaseError]: 'Database operation failed',
  [AppErrorCodes.configurationError]: 'Server configuration error',
  [AppErrorCodes.duplicateEntry]: 'Duplicate entry',
  [AppErrorCodes.invalidState]: 'Invalid state for this operation',
  [AppErrorCodes.operationFailed]: 'Operation failed',
  [AppErrorCodes.integrationError]: 'Integration error',
  [AppErrorCodes.apiKeyInvalid]: 'Invalid or expired API key',
  [AppErrorCodes.webhookFailed]: 'Webhook delivery failed',
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
