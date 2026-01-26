import { logger } from "@/shared/lib/utils/logger";
import { logAgentAudit } from "@/lib/agent/audit";

export interface ErrorContext {
  service?: string;
  runId?: string; // For agent runs
  jobId?: string; // For background jobs
  productId?: string;
  [key: string]: unknown;
}

/**
 * Centralized error handling system.
 * Captures exceptions, logs them to the system log, and optionally
 * synchronizes with domain-specific audit logs (like agentAuditLog).
 */
export const ErrorSystem = {
  /**
   * Capture and log an exception.
   * @param error The error object or message
   * @param context Contextual information (service name, IDs, etc.)
   */
  captureException: async (error: unknown, context: ErrorContext = {}) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const service = context.service || "unknown";

    // 1. Log to System Log (File/Console)
    logger.error(`[${service}] ${message}`, {
      ...context,
      stack,
    });

    // 2. Domain-Specific Logging
    
    // If it's an Agent Run, log to Agent Audit
    if (context.runId) {
      try {
        await logAgentAudit(context.runId, "error", message, {
          errorId: context.errorId || "unknown",
          stack,
          ...context
        });
      } catch (auditError) {
        logger.error(`[ErrorSystem] Failed to log to Agent Audit:`, auditError);
      }
    }

    // Future: Integration with external error tracking (Sentry, etc.) could go here
  },

  /**
   * Log a warning (non-fatal issue).
   */
  logWarning: async (message: string, context: ErrorContext = {}) => {
    const service = context.service || "unknown";
    
    logger.warn(`[${service}] ${message}`, context);

    if (context.runId) {
       try {
        await logAgentAudit(context.runId, "warning", message, context);
      } catch (auditError) {
        logger.warn(`[ErrorSystem] Failed to log warning to Agent Audit:`, auditError);
      }
    }
  },

  /**
   * Log an operational info event.
   */
  logInfo: (message: string, context: ErrorContext = {}) => {
     const service = context.service || "unknown";
     logger.info(`[${service}] ${message}`, context);
     return Promise.resolve();
  }
};
