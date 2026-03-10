import type {
  BaseImportErrorClass,
  BaseImportErrorCode,
  BaseImportRunRecord,
} from '@/shared/contracts/integrations';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';

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

export const buildSummaryMessage = (
  stats: BaseImportRunRecord['stats'],
  dryRun: boolean
): string => {
  const prefix = dryRun ? 'Dry-run completed' : 'Import completed';
  return `${prefix}: ${stats?.imported ?? 0} imported, ${stats?.updated ?? 0} updated, ${stats?.skipped ?? 0} skipped, ${stats?.failed ?? 0} failed.`;
};

export const classifyBaseImportError = (error: unknown): ClassifiedBaseImportError => {
  if (!error) {
    return {
      code: 'UNEXPECTED_ERROR',
      errorClass: 'transient',
      retryable: true,
      message: 'Unexpected empty error payload.',
    };
  }

  if (isAppError(error)) {
    const message = error.message || 'Import error';
    if (error.code === AppErrorCodes.timeout) {
      return withRetryAfter(
        {
          code: 'TIMEOUT',
          errorClass: 'transient',
          retryable: true,
          message,
        },
        error.retryAfterMs
      );
    }
    if (error.code === AppErrorCodes.rateLimited) {
      return withRetryAfter(
        {
          code: 'RATE_LIMITED',
          errorClass: 'transient',
          retryable: true,
          message,
        },
        error.retryAfterMs
      );
    }
    if (error.code === AppErrorCodes.externalService) {
      return withRetryAfter(
        {
          code: 'BASE_FETCH_ERROR',
          errorClass: error.retryable ? 'transient' : 'permanent',
          retryable: error.retryable,
          message,
        },
        error.retryAfterMs
      );
    }
    if (error.code === AppErrorCodes.configurationError) {
      return {
        code: 'PRECHECK_FAILED',
        errorClass: 'configuration',
        retryable: false,
        message,
      };
    }
    if (error.code === AppErrorCodes.validation) {
      return {
        code: 'VALIDATION_ERROR',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
  }

  if (error instanceof Error) {
    const message = error.message;
    const normalized = message.toLowerCase();
    if (normalized.includes('timed out') || normalized.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        errorClass: 'transient',
        retryable: true,
        message,
      };
    }
    if (
      normalized.includes('econnreset') ||
      normalized.includes('econnrefused') ||
      normalized.includes('network') ||
      normalized.includes('fetch failed')
    ) {
      return {
        code: 'NETWORK_ERROR',
        errorClass: 'transient',
        retryable: true,
        message,
      };
    }
    if (normalized.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('duplicate') && normalized.includes('sku')) {
      return {
        code: 'DUPLICATE_SKU',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('sku') && normalized.includes('unique')) {
      return {
        code: 'DUPLICATE_SKU',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('base') && normalized.includes('fetch')) {
      return {
        code: 'BASE_FETCH_ERROR',
        errorClass: 'transient',
        retryable: true,
        message,
      };
    }
    if (normalized.includes('missing') && normalized.includes('base')) {
      return {
        code: 'MISSING_BASE_ID',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('missing') && normalized.includes('sku')) {
      return {
        code: 'MISSING_SKU',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('catalog')) {
      return {
        code: 'MISSING_CATALOG',
        errorClass: 'configuration',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('price group')) {
      return {
        code: 'MISSING_PRICE_GROUP',
        errorClass: 'configuration',
        retryable: false,
        message,
      };
    }
    if (normalized.includes('link')) {
      return {
        code: 'LINKING_ERROR',
        errorClass: 'transient',
        retryable: true,
        message,
      };
    }
    if (normalized.includes('conflict')) {
      return {
        code: 'CONFLICT',
        errorClass: 'permanent',
        retryable: false,
        message,
      };
    }
    return {
      code: 'UNEXPECTED_ERROR',
      errorClass: 'transient',
      retryable: true,
      message,
    };
  }

  return {
    code: 'UNEXPECTED_ERROR',
    errorClass: 'transient',
    retryable: true,
    message: 'Unexpected import error.',
  };
};

export const determineBaseImportTerminalStatus = (
  stats: BaseImportRunRecord['stats'],
  options?: { hasPendingItems?: boolean }
): BaseImportRunRecord['status'] => {
  const hadFailures = (stats?.failed ?? 0) > 0;
  const hadSuccess =
    (stats?.imported ?? 0) > 0 || (stats?.updated ?? 0) > 0 || (stats?.skipped ?? 0) > 0;
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
