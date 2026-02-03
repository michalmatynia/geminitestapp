/**
 * Simple logger utility to provide a consistent interface for logging.
 * This can be expanded to log to external services or files if needed.
 */

type LogLevel = "info" | "warn" | "error" | "log";

const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.info(formatMessage("info", message), ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(formatMessage("warn", message), ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(formatMessage("error", message), ...args);
    // Integration with centralized observability
    if (typeof window !== "undefined") {
      void (async (): Promise<void> => {
        try {
          // Use string message or first arg as error object
          const error = args[0] instanceof Error ? args[0] : new Error(message);
          const { logClientError } = await import("@/shared/utils/observability/client-error-logger");
          logClientError(error, { context: { source: "shared-logger", message, args } });
        } catch {
          // Fallback if logClientError fails or import fails
        }
      })();
    }
  },
  log: (message: string, ...args: unknown[]): void => {
    console.log(formatMessage("log", message), ...args);
  },
};
