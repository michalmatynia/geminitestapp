import { getRequestContext } from '@/shared/lib/observability/request-context';

/**
 * Simple logger utility to provide a consistent interface for logging.
 * This can be expanded to log to external services or files if needed.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'log';

export type LogHandler = (
  level: LogLevel,
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
) => void;

const handlers: LogHandler[] = [];

export const registerLogHandler = (handler: LogHandler): void => {
  handlers.push(handler);
};

const formatMessage = (
  level: LogLevel,
  message: string,
  _context?: Record<string, unknown>
): string => {
  const timestamp = new Date().toISOString();
  const requestContext = getRequestContext();
  const requestId = requestContext?.requestId ? ` [RID:${requestContext.requestId}]` : '';
  const userId = requestContext?.userId ? ` [UID:${requestContext.userId}]` : '';

  // For human readable console output while maintaining parsability
  return `[${timestamp}] [${level.toUpperCase()}]${requestId}${userId} ${message}`;
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>): void => {
    if (handlers.length === 0) {
      console.info(formatMessage('info', message, context), context || '');
    }
    handlers.forEach((h) => h('info', message, undefined, context));
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    if (handlers.length === 0) {
      console.warn(formatMessage('warn', message, context), context || '');
    }
    handlers.forEach((h) => h('warn', message, undefined, context));
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
    const combinedContext = {
      ...(context || {}),
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    };

    if (handlers.length === 0) {
      console.error(formatMessage('error', message, combinedContext), combinedContext);
    }

    handlers.forEach((h) => h('error', message, error, context));

    // Integration with centralized observability (Client-side)
    // Only call if no handlers are registered to prevent duplicate logging
    if (typeof window !== 'undefined' && handlers.length === 0) {
      void (async (): Promise<void> => {
        try {
          const { logClientError } =
            await import('@/shared/utils/observability/client-error-logger');
          const err = error instanceof Error ? error : new Error(message);
          logClientError(err, {
            context: { source: 'shared-logger', message, ...combinedContext },
          });
        } catch {
          // Fallback if logClientError fails or import fails
        }
      })();
    }
  },
  log: (message: string, context?: Record<string, unknown>): void => {
    if (handlers.length === 0) {
      console.log(formatMessage('log', message, context), context || '');
    }
    handlers.forEach((h) => h('log', message, undefined, context));
  },
};
