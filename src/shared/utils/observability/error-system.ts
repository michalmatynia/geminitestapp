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
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const ErrorCategories = ERROR_CATEGORY;
export type { ErrorCategory, ErrorContext };

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
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
      const { classifyError } = await import('@/shared/errors/error-classifier');

      const message = error instanceof Error ? error.message : String(error);
      const service = context.service || 'unknown';
      const category = context.category || classifyError(error);

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

      // 2. Domain-Specific Logging

      // If it's an Agent Run, log to Agent Audit
      if (context.runId) {
        try {
          const { logAgentAudit } = await import('@/features/ai/agent-runtime/audit');
          await logAgentAudit(context.runId, 'error', message, {
            errorId: context.errorId || 'unknown',
            ...context,
          });
        } catch (auditError) {
          logClientError(auditError);
          // Fallback to logger if audit logging fails
          const { logger } = await import('@/shared/utils/logger');
          logger.error('[ErrorSystem] Failed to log to Agent Audit:', auditError);
        }
      }
    } catch (importError) {
      logClientError(importError);
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[ErrorSystem] Failed to import dependencies:', importError);
    }
  },

  /**
   * Log a warning (non-fatal issue).
   */
  logWarning: async (message: string, context: ErrorContext = {}): Promise<void> => {
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
      const { classifyError } = await import('@/shared/errors/error-classifier');
      const service = context.service || 'unknown';
      const category = context.category || classifyError(message);

      await logSystemEvent({
        level: 'warn',
        message: `[${service}] ${message}`,
        source: service,
        context: {
          ...context,
          category,
        },
      });

      if (context.runId) {
        try {
          const { logAgentAudit } = await import('@/features/ai/agent-runtime/audit');
          await logAgentAudit(context.runId, 'warning', message, context);
        } catch (auditError) {
          logClientError(auditError);
          const { logger } = await import('@/shared/utils/logger');
          logger.warn('[ErrorSystem] Failed to log warning to Agent Audit:', { error: auditError });
        }
      }
    } catch (importError) {
      logClientError(importError);
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[ErrorSystem] Failed to import dependencies:', importError);
    }
  },

  /**
   * Log a validation error.
   */
  logValidationError: async (message: string, context: ErrorContext = {}): Promise<void> => {
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
      logClientError(importError);
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[ErrorSystem] Failed to import dependencies:', importError);
    }
  },

  /**
   * Log an operational info event.
   */
  logInfo: async (message: string, context: ErrorContext = {}): Promise<void> => {
    try {
      const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
      const { classifyError } = await import('@/shared/errors/error-classifier');
      const service = context.service || 'unknown';
      const category = context.category || classifyError(message);

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
      logClientError(importError);
      const { logger } = await import('@/shared/utils/logger');
      logger.error('[ErrorSystem] Failed to import dependencies:', importError);
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
