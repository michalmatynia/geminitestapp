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
import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';


export const ErrorCategories = ERROR_CATEGORY;
export type { ErrorCategory, ErrorContext };

const logErrorSystemFailure = async (
  message: string,
  error: unknown,
  level: 'error' | 'warn' = 'error'
): Promise<void> => {
  try {
    const { logger } = (await import('@/shared/utils/logger')) as {
      logger: {
        error: (msg: string, error?: unknown, context?: Record<string, unknown>) => void;
        warn: (msg: string, context?: Record<string, unknown>) => void;
      };
    };
    if (level === 'warn') {
      logger.warn(message, { service: 'error-system', error });
      return;
    }
    logger.error(message, error, { service: 'error-system' });
  } catch {
    reportObservabilityInternalError(error, {
      source: 'error-system',
      action: level === 'warn' ? 'warn-fallback' : 'error-fallback',
      message,
    });
  }
};

async function isLoggingEnabled(type: 'info' | 'activity' | 'error'): Promise<boolean> {
  if (typeof window !== 'undefined') return true;
  try {
    const { isServerLoggingEnabled } = await import('@/shared/lib/observability/logging-controls-server');
    return await isServerLoggingEnabled(type);
  } catch (error) {
    reportObservabilityInternalError(error, {
      source: 'error-system',
      action: 'isLoggingEnabled',
      type,
    });
    return true;
  }
}

/**
 * Centralized error handling system.
 * Captures exceptions, logs them to the system log (DB), and optionally
 * synchronizes with domain-specific audit logs (like agentAuditLog).
 */
export const ErrorSystem = {
  /**
   * Capture and log an exception.
   * @param error The error object or message
   * @param context Contextual information (service name, IDs, etc.)
   */
  captureException: async (error: unknown, context: ErrorContext = {}): Promise<void> => {
    if (!(await isLoggingEnabled('error'))) return;
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
      const isBrowser = typeof window !== 'undefined';
      let category = context.category;
      
      if (!category && !isBrowser) {
        try {
          const { classifyError } = await import('@/shared/errors/error-classifier');
          category = classifyError(error);
        } catch (classifyErr) {
          logErrorSystemFailure('[ErrorSystem] Failed to classify error.', classifyErr, 'warn');
        }
      }

      const message = error instanceof Error ? error.message : String(error);
      const service = context.service || 'unknown';

      // 1. Log to System Log (DB + Console)
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

      if (!isBrowser) {
        // 2. Domain-Specific Logging
        await (await import('./error-enricher-registry')).notifyErrorEnrichers(error, {
          ...context,
          category,
          message,
          level: 'error',
        });
      }
    } catch (importError) {
      await logErrorSystemFailure('[ErrorSystem] Failed to import dependencies.', importError);
    }
  },

  /**
   * Log a warning (non-fatal issue).
   */
  logWarning: async (message: string, context: ErrorContext = {}): Promise<void> => {
    if (!(await isLoggingEnabled('error'))) return;
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
      const isBrowser = typeof window !== 'undefined';
      const service = context.service || 'unknown';
      let category = context.category;

      if (!category && !isBrowser) {
        try {
          const { classifyError } = await import('@/shared/errors/error-classifier');
          category = classifyError(message);
        } catch (classifyErr) {
          logErrorSystemFailure('[ErrorSystem] Failed to classify warning.', classifyErr, 'warn');
        }
      }

      await logSystemEvent({
        level: 'warn',
        message: `[${service}] ${message}`,
        source: service,
        context: {
          ...context,
          category,
        },
      });

      if (!isBrowser) {
        // Domain-Specific Logging
        await (await import('./error-enricher-registry')).notifyErrorEnrichers(message, {
          ...context,
          category,
          message,
          level: 'warn',
        });
      }
    } catch (importError) {
      await logErrorSystemFailure('[ErrorSystem] Failed to import dependencies.', importError);
    }
  },

  /**
   * Log a validation error.
   */
  logValidationError: async (message: string, context: ErrorContext = {}): Promise<void> => {
    if (!(await isLoggingEnabled('error'))) return;
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
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
    } catch (importError) {
      await logErrorSystemFailure('[ErrorSystem] Failed to import dependencies.', importError);
    }
  },

  /**
   * Log an operational info event.
   */
  logInfo: async (message: string, context: ErrorContext = {}): Promise<void> => {
    if (!(await isLoggingEnabled('info'))) return;
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
      const isBrowser = typeof window !== 'undefined';
      const service = context.service || 'unknown';
      let category = context.category;

      if (!category && !isBrowser) {
        try {
          const { classifyError } = await import('@/shared/errors/error-classifier');
          category = classifyError(message);
        } catch (classifyErr) {
          logErrorSystemFailure('[ErrorSystem] Failed to classify info event.', classifyErr, 'warn');
        }
      }

      await logSystemEvent({
        level: 'info',
        message: `[${service}] ${message}`,
        source: service,
        context: {
          ...context,
          category,
        },
      });
    } catch (importError) {
      await logErrorSystemFailure('[ErrorSystem] Failed to import dependencies.', importError);
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
