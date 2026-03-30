import {
  ERROR_CATEGORY,
  type ErrorCategory,
  type ErrorContext,
} from '@/shared/contracts/observability';
import {
  classifyError as classifySharedError,
  getSuggestedActions as getSharedSuggestedActions,
} from '@/shared/errors/error-classifier';
import { isAppError } from '@/shared/errors/app-error';
import { resolveErrorUserMessage } from '@/shared/errors/error-catalog';
import type { ResolvedError } from '@/shared/contracts/base';
import { isClientLoggingControlEnabled } from '@/shared/lib/observability/logging-controls-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger-client';
import { logger } from '@/shared/utils/logger';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const ErrorCategories = ERROR_CATEGORY;
export type { ErrorCategory, ErrorContext };

const reportErrorSystemClientCatch = (
  error: unknown,
  action: string,
  context: ErrorContext
): void => {
  logClientCatch(error, {
    source: 'error-system-client',
    action,
    service: context.service || 'unknown',
    ...(context.category ? { category: context.category } : {}),
  });
};

/**
 * Client-safe error handling system.
 * Captures exceptions and logs them through the client logger.
 */
export const ErrorSystem = {
  /**
   * Capture and log an exception.
   * @param error The error object or message
   * @param context Contextual information (service name, IDs, etc.)
   */
  captureException: async (error: unknown, context: ErrorContext = {}): Promise<void> => {
    if (!isClientLoggingControlEnabled('error')) return;
    try {
      const message = error instanceof Error ? error.message : String(error);
      const service = context.service || 'unknown';
      const category = context.category || classifySharedError(error);

      await logSystemEvent({
        level: 'error',
        message: `[${service}] ${message}`,
        source: service,
        error,
        context: {
          ...context,
          category,
          jobId: context.jobId,
          runId: context.runId,
          productId: context.productId,
        },
      });
    } catch (logError) {
      reportErrorSystemClientCatch(logError, 'captureException', context);
      logger.error('[ErrorSystem] Failed to log client error:', logError);
    }
  },

  /**
   * Log a warning (non-fatal issue).
   */
  logWarning: async (message: string, context: ErrorContext = {}): Promise<void> => {
    if (!isClientLoggingControlEnabled('error')) return;
    try {
      const service = context.service || 'unknown';
      const category = context.category || classifySharedError(message);

      await logSystemEvent({
        level: 'warn',
        message: `[${service}] ${message}`,
        source: service,
        context: {
          ...context,
          category,
        },
      });
    } catch (logError) {
      reportErrorSystemClientCatch(logError, 'logWarning', context);
      logger.warn('[ErrorSystem] Failed to log client warning:', { error: logError });
    }
  },

  /**
   * Log a validation error.
   */
  logValidationError: async (message: string, context: ErrorContext = {}): Promise<void> => {
    if (!isClientLoggingControlEnabled('error')) return;
    try {
      const service = context.service || 'unknown';

      await logSystemEvent({
        level: 'warn',
        message: `[Validation] [${service}] ${message}`,
        source: service,
        context: {
          ...context,
          category: ERROR_CATEGORY.VALIDATION,
        },
      });
    } catch (logError) {
      reportErrorSystemClientCatch(logError, 'logValidationError', context);
      logger.error('[ErrorSystem] Failed to log client validation error:', logError);
    }
  },

  /**
   * Log an operational info event.
   */
  logInfo: async (message: string, context: ErrorContext = {}): Promise<void> => {
    if (!isClientLoggingControlEnabled('info')) return;
    try {
      const service = context.service || 'unknown';
      const category = context.category || classifySharedError(message);

      await logSystemEvent({
        level: 'info',
        message: `[${service}] ${message}`,
        source: service,
        context: {
          ...context,
          category,
        },
      });
    } catch (logError) {
      reportErrorSystemClientCatch(logError, 'logInfo', context);
      logger.error('[ErrorSystem] Failed to log client info:', logError);
    }
  },

  /**
   * Generate a structured error report for debugging or display.
   */
  generateErrorReport: (error: unknown, context: ErrorContext = {}): Record<string, unknown> => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const contextCategory = context.category;
    const category: ErrorCategory =
      typeof contextCategory === 'string' &&
      (Object.values(ErrorCategories) as string[]).includes(contextCategory)
        ? (contextCategory as ErrorCategory)
        : classifySharedError(error);

    const baseResolved: ResolvedError | null = isAppError(error)
      ? {
          errorId: context.errorId || `err_${Date.now()}`,
          message: error.message,
          code: error.code,
          httpStatus: error.httpStatus,
          expected: error.expected,
          critical: error.critical,
          retryable: error.retryable,
          category,
          suggestedActions: getSharedSuggestedActions(category, error),
          ...(typeof error.retryAfterMs === 'number' ? { retryAfterMs: error.retryAfterMs } : {}),
          ...(error.meta ? { meta: error.meta } : {}),
          cause: error.cause,
        }
      : null;
    const userMessage = context.userMessage || (baseResolved ? resolveErrorUserMessage(baseResolved) : null);

    return {
      id: context.errorId || `err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      category,
      message,
      userMessage:
        userMessage ||
        'An unexpected error occurred. Please try again or contact support.',
      service: context.service || 'unknown',
      suggestedActions: getSharedSuggestedActions(category, error),
      context: {
        ...context,
        // Remove sensitive or redundant info
        errorId: undefined,
        userMessage: undefined,
        category: undefined,
      },
      debug: process.env['NODE_ENV'] !== 'production' ? { stack } : undefined,
    };
  },
};
