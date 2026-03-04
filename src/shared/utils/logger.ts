import { getRequestContext } from '@/shared/lib/observability/request-context';
import { getActiveOtelContextAttributes } from '@/shared/lib/observability/otel-context';

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
  const traceId = requestContext?.traceId ? ` [TID:${requestContext.traceId}]` : '';
  const correlationId = requestContext?.correlationId
    ? ` [CID:${requestContext.correlationId}]`
    : '';
  const userId = requestContext?.userId ? ` [UID:${requestContext.userId}]` : '';

  // For human readable console output while maintaining parsability
  return `[${timestamp}] [${level.toUpperCase()}]${requestId}${traceId}${correlationId}${userId} ${message}`;
};

const SERVICE_PREFIX_PATTERN = /^\[([A-Za-z0-9_.:-]+)\]/;

const readServiceFromMessage = (message: string): string | undefined => {
  const match = message.match(SERVICE_PREFIX_PATTERN);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : undefined;
};

const normalizeContext = (
  message: string,
  context?: Record<string, unknown>
): Record<string, unknown> => {
  const requestContext = getRequestContext();
  const otelContext = getActiveOtelContextAttributes();
  const normalized: Record<string, unknown> = {
    ...(context ?? {}),
  };

  if (typeof normalized['service'] !== 'string' || normalized['service'].trim().length === 0) {
    const inferredService = readServiceFromMessage(message);
    if (inferredService) {
      normalized['service'] = inferredService;
    }
  }
  if (
    requestContext?.requestId &&
    (typeof normalized['requestId'] !== 'string' || normalized['requestId'].trim().length === 0)
  ) {
    normalized['requestId'] = requestContext.requestId;
  }
  if (
    requestContext?.traceId &&
    (typeof normalized['traceId'] !== 'string' || normalized['traceId'].trim().length === 0)
  ) {
    normalized['traceId'] = requestContext.traceId;
  }
  if (
    requestContext?.correlationId &&
    (typeof normalized['correlationId'] !== 'string' ||
      normalized['correlationId'].trim().length === 0)
  ) {
    normalized['correlationId'] = requestContext.correlationId;
  }
  if (
    requestContext?.userId &&
    (typeof normalized['userId'] !== 'string' || normalized['userId'].trim().length === 0)
  ) {
    normalized['userId'] = requestContext.userId;
  }
  if (
    otelContext.otelTraceId &&
    (typeof normalized['otelTraceId'] !== 'string' || normalized['otelTraceId'].trim().length === 0)
  ) {
    normalized['otelTraceId'] = otelContext.otelTraceId;
  }
  if (
    otelContext.otelSpanId &&
    (typeof normalized['otelSpanId'] !== 'string' || normalized['otelSpanId'].trim().length === 0)
  ) {
    normalized['otelSpanId'] = otelContext.otelSpanId;
  }
  if (
    otelContext.otelTraceFlags &&
    (typeof normalized['otelTraceFlags'] !== 'string' ||
      normalized['otelTraceFlags'].trim().length === 0)
  ) {
    normalized['otelTraceFlags'] = otelContext.otelTraceFlags;
  }

  return normalized;
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>): void => {
    const normalizedContext = normalizeContext(message, context);
    if (handlers.length === 0) {
      console.info(formatMessage('info', message, normalizedContext), normalizedContext);
    }
    handlers.forEach((h) => h('info', message, undefined, normalizedContext));
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    const normalizedContext = normalizeContext(message, context);
    if (handlers.length === 0) {
      console.warn(formatMessage('warn', message, normalizedContext), normalizedContext);
    }
    handlers.forEach((h) => h('warn', message, undefined, normalizedContext));
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
    const normalizedContext = normalizeContext(message, context);
    const combinedContext = {
      ...normalizedContext,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    };

    if (handlers.length === 0) {
      console.error(formatMessage('error', message, combinedContext), combinedContext);
    }

    handlers.forEach((h) => h('error', message, error, normalizedContext));

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
    const normalizedContext = normalizeContext(message, context);
    if (handlers.length === 0) {
      console.log(formatMessage('log', message, normalizedContext), normalizedContext);
    }
    handlers.forEach((h) => h('log', message, undefined, normalizedContext));
  },
};

type ServiceLogger = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
  log: (message: string, context?: Record<string, unknown>) => void;
};

export const createServiceLogger = (service: string): ServiceLogger => {
  const normalizedService = service.trim();
  const withService = (context?: Record<string, unknown>): Record<string, unknown> => ({
    ...(context ?? {}),
    service: normalizedService,
  });

  return {
    info: (message: string, context?: Record<string, unknown>): void => {
      logger.info(message, withService(context));
    },
    warn: (message: string, context?: Record<string, unknown>): void => {
      logger.warn(message, withService(context));
    },
    error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
      logger.error(message, error, withService(context));
    },
    log: (message: string, context?: Record<string, unknown>): void => {
      logger.log(message, withService(context));
    },
  };
};
