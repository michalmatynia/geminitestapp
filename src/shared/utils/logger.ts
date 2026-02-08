import { getRequestContext } from '@/shared/lib/observability/request-context';

/**
 * Simple logger utility to provide a consistent interface for logging.
 * This can be expanded to log to external services or files if needed.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'log';

const formatMessage = (level: LogLevel, message: string, context?: Record<string, unknown>): string => {
  const timestamp = new Date().toISOString();
  const requestContext = getRequestContext();
  const requestId = requestContext?.requestId ? ` [RID:${requestContext.requestId}]` : '';
  const userId = requestContext?.userId ? ` [UID:${requestContext.userId}]` : '';
  
  const _structuredData = {
    timestamp,
    level: level.toUpperCase(),
    message,
    requestId: requestContext?.requestId,
    userId: requestContext?.userId,
    ...context,
  };

  // For human readable console output while maintaining parsability
  return `[${timestamp}] [${level.toUpperCase()}]${requestId}${userId} ${message}`;
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>): void => {
    console.info(formatMessage('info', message, context), context || '');
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    console.warn(formatMessage('warn', message, context), context || '');
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
    const combinedContext = { 
      ...(context || {}), 
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error 
    };
    console.error(formatMessage('error', message, combinedContext), combinedContext);
    
    // Integration with centralized observability
    if (typeof window !== 'undefined') {
      void (async (): Promise<void> => {
        try {
          const err = error instanceof Error ? error : new Error(message);
          const { logClientError } = await import('@/shared/utils/observability/client-error-logger');
          logClientError(err, { context: { source: 'shared-logger', message, ...combinedContext } });
        } catch {
          // Fallback if logClientError fails or import fails
        }
      })();
    }
  },
  log: (message: string, context?: Record<string, unknown>): void => {
    console.log(formatMessage('log', message, context), context || '');
  },
};
