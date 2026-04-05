import type { BaseImportErrorClass, BaseImportErrorCode, BaseImportRunRecord } from '@/shared/contracts/integrations/base-com';
import { AppErrorCodes, isAppError, type AppError } from '@/shared/errors/app-error';

import {
  BASE_IMPORT_RETRY_BASE_DELAY_MS,
  BASE_IMPORT_RETRY_MAX_DELAY_MS,
} from './base-import-service-shared';

type ClassifiedBaseImportError = {
  code: BaseImportErrorCode;
  errorClass: BaseImportErrorClass;
  retryable: boolean;
  message: string;
  retryAfterMs?: number;
};

const withRetryAfter = (
  result: ClassifiedBaseImportError,
  retryAfterMs: number | undefined
): ClassifiedBaseImportError => {
  if (retryAfterMs === undefined) return result;
  return {
    ...result,
    retryAfterMs,
  };
};

const buildClassifiedBaseImportError = (input: {
  code: BaseImportErrorCode;
  errorClass: BaseImportErrorClass;
  retryable: boolean;
  message: string;
  retryAfterMs?: number;
}): ClassifiedBaseImportError =>
  withRetryAfter(
    {
      code: input.code,
      errorClass: input.errorClass,
      retryable: input.retryable,
      message: input.message,
    },
    input.retryAfterMs
  );

const matchesAll = (value: string, parts: string[]): boolean =>
  parts.every((part) => value.includes(part));

const buildUnexpectedImportError = (message: string): ClassifiedBaseImportError =>
  buildClassifiedBaseImportError({
    code: 'UNEXPECTED_ERROR',
    errorClass: 'transient',
    retryable: true,
    message,
  });

const classifyKnownAppImportError = (error: AppError): ClassifiedBaseImportError | null => {
  const message = error.message || 'Import error';

  switch (error.code) {
    case AppErrorCodes.timeout:
      return buildClassifiedBaseImportError({
        code: 'TIMEOUT',
        errorClass: 'transient',
        retryable: true,
        message,
        retryAfterMs: error.retryAfterMs,
      });
    case AppErrorCodes.rateLimited:
      return buildClassifiedBaseImportError({
        code: 'RATE_LIMITED',
        errorClass: 'transient',
        retryable: true,
        message,
        retryAfterMs: error.retryAfterMs,
      });
    case AppErrorCodes.externalService:
      return buildClassifiedBaseImportError({
        code: 'BASE_FETCH_ERROR',
        errorClass: error.retryable ? 'transient' : 'permanent',
        retryable: error.retryable,
        message,
        retryAfterMs: error.retryAfterMs,
      });
    case AppErrorCodes.configurationError:
      return buildClassifiedBaseImportError({
        code: 'PRECHECK_FAILED',
        errorClass: 'configuration',
        retryable: false,
        message,
      });
    case AppErrorCodes.validation:
      return buildClassifiedBaseImportError({
        code: 'VALIDATION_ERROR',
        errorClass: 'permanent',
        retryable: false,
        message,
      });
    default:
      return null;
  }
};

const ERROR_MESSAGE_CLASSIFIERS: Array<{
  code: BaseImportErrorCode;
  errorClass: BaseImportErrorClass;
  retryable: boolean;
  matches: (normalized: string) => boolean;
}> = [
  {
    code: 'TIMEOUT',
    errorClass: 'transient',
    retryable: true,
    matches: (normalized) => normalized.includes('timed out') || normalized.includes('timeout'),
  },
  {
    code: 'NETWORK_ERROR',
    errorClass: 'transient',
    retryable: true,
    matches: (normalized) =>
      ['econnreset', 'econnrefused', 'network', 'fetch failed'].some((part) =>
        normalized.includes(part)
      ),
  },
  {
    code: 'VALIDATION_ERROR',
    errorClass: 'permanent',
    retryable: false,
    matches: (normalized) => normalized.includes('validation'),
  },
  {
    code: 'DUPLICATE_SKU',
    errorClass: 'permanent',
    retryable: false,
    matches: (normalized) =>
      matchesAll(normalized, ['duplicate', 'sku']) || matchesAll(normalized, ['sku', 'unique']),
  },
  {
    code: 'BASE_FETCH_ERROR',
    errorClass: 'transient',
    retryable: true,
    matches: (normalized) => matchesAll(normalized, ['base', 'fetch']),
  },
  {
    code: 'MISSING_BASE_ID',
    errorClass: 'permanent',
    retryable: false,
    matches: (normalized) => matchesAll(normalized, ['missing', 'base']),
  },
  {
    code: 'MISSING_SKU',
    errorClass: 'permanent',
    retryable: false,
    matches: (normalized) => matchesAll(normalized, ['missing', 'sku']),
  },
  {
    code: 'MISSING_CATALOG',
    errorClass: 'configuration',
    retryable: false,
    matches: (normalized) => normalized.includes('catalog'),
  },
  {
    code: 'MISSING_PRICE_GROUP',
    errorClass: 'configuration',
    retryable: false,
    matches: (normalized) => normalized.includes('price group'),
  },
  {
    code: 'LINKING_ERROR',
    errorClass: 'transient',
    retryable: true,
    matches: (normalized) => normalized.includes('link'),
  },
  {
    code: 'CONFLICT',
    errorClass: 'permanent',
    retryable: false,
    matches: (normalized) => normalized.includes('conflict'),
  },
];

const classifyErrorMessage = (message: string): ClassifiedBaseImportError => {
  const normalized = message.toLowerCase();
  const matchedClassifier = ERROR_MESSAGE_CLASSIFIERS.find(({ matches }) => matches(normalized));
  return matchedClassifier
    ? buildClassifiedBaseImportError({
      code: matchedClassifier.code,
      errorClass: matchedClassifier.errorClass,
      retryable: matchedClassifier.retryable,
      message,
    })
    : buildUnexpectedImportError(message);
};

const hasBaseImportSuccess = (stats: BaseImportRunRecord['stats']): boolean =>
  (stats?.imported ?? 0) > 0 || (stats?.updated ?? 0) > 0 || (stats?.skipped ?? 0) > 0;

const hasBaseImportFailures = (stats: BaseImportRunRecord['stats']): boolean =>
  (stats?.failed ?? 0) > 0;

export const buildSummaryMessage = (
  stats: BaseImportRunRecord['stats'],
  dryRun: boolean
): string => {
  const prefix = dryRun ? 'Dry-run completed' : 'Import completed';
  return `${prefix}: ${stats?.imported ?? 0} imported, ${stats?.updated ?? 0} updated, ${stats?.skipped ?? 0} skipped, ${stats?.failed ?? 0} failed.`;
};

export const classifyBaseImportError = (error: unknown): ClassifiedBaseImportError => {
  if (!error) {
    return buildUnexpectedImportError('Unexpected empty error payload.');
  }

  if (isAppError(error)) {
    return classifyKnownAppImportError(error) ?? buildUnexpectedImportError(error.message || 'Import error');
  }

  if (error instanceof Error) {
    return classifyErrorMessage(error.message);
  }

  return buildUnexpectedImportError('Unexpected import error.');
};

export const determineBaseImportTerminalStatus = (
  stats: BaseImportRunRecord['stats'],
  options?: { hasPendingItems?: boolean }
): BaseImportRunRecord['status'] => {
  const hadFailures = hasBaseImportFailures(stats);
  const hadSuccess = hasBaseImportSuccess(stats);
  if (options?.hasPendingItems) {
    return hadSuccess ? 'partial_success' : 'failed';
  }
  if (hadFailures && hadSuccess) return 'partial_success';
  if (hadFailures) return 'failed';
  return 'completed';
};

export const computeRetryDelayMs = (attempt: number, retryAfterMs?: number): number => {
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(Math.floor(retryAfterMs), BASE_IMPORT_RETRY_MAX_DELAY_MS);
  }
  const jitter = Math.floor(Math.random() * 500);
  const exponential = BASE_IMPORT_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponential + jitter, BASE_IMPORT_RETRY_MAX_DELAY_MS);
};
