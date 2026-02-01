export interface ErrorContext {
  service?: string;
  runId?: string; // For agent runs
  jobId?: string; // For background jobs
  productId?: string;
  errorId?: string;
  [key: string]: unknown;
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
    try {
      const { logSystemEvent } = await import("@/features/observability/server");
      const message = error instanceof Error ? error.message : String(error);
      const service = context.service || "unknown";

      // 1. Log to System Log (DB + Console)
      await logSystemEvent({
        level: "error",
        message: `[${service}] ${message}`,
        source: service,
        error,
        context: {
          ...context,
          jobId: context.jobId,
          runId: context.runId,
          productId: context.productId
        }
      });

      // 2. Domain-Specific Logging
      
      // If it's an Agent Run, log to Agent Audit
      if (context.runId) {
        try {
          const { logAgentAudit } = await import("@/features/agent-runtime/server");
          await logAgentAudit(context.runId, "error", message, {
            errorId: context.errorId || "unknown",
            ...context
          });
        } catch (auditError) {
          // Fallback to console if audit logging fails
          console.error(`[ErrorSystem] Failed to log to Agent Audit:`, auditError);
        }
      }
    } catch (importError) {
      console.error(`[ErrorSystem] Failed to import dependencies:`, importError);
    }
  },

  /**
   * Log a warning (non-fatal issue).
   */
  logWarning: async (message: string, context: ErrorContext = {}): Promise<void> => {
    try {
      const { logSystemEvent } = await import("@/features/observability/server");
      const service = context.service || "unknown";
      
      await logSystemEvent({
        level: "warn",
        message: `[${service}] ${message}`,
        source: service,
        context
      });

      if (context.runId) {
         try {
          const { logAgentAudit } = await import("@/features/agent-runtime/server");
          await logAgentAudit(context.runId, "warning", message, context);
        } catch (auditError) {
          console.warn(`[ErrorSystem] Failed to log warning to Agent Audit:`, auditError);
        }
      }
    } catch (importError) {
      console.error(`[ErrorSystem] Failed to import dependencies:`, importError);
    }
  },

  /**
   * Log an operational info event.
   */
  logInfo: async (message: string, context: ErrorContext = {}): Promise<void> => {
    try {
      const { logSystemEvent } = await import("@/features/observability/server");
      const service = context.service || "unknown";
      
      await logSystemEvent({
        level: "info",
        message: `[${service}] ${message}`,
        source: service,
        context
      });
    } catch (importError) {
      console.error(`[ErrorSystem] Failed to import dependencies:`, importError);
    }
  }
};
