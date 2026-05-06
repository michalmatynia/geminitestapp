/**
 * Application Logger
 * 
 * Centralized logging utility with comprehensive observability integration.
 * Features:
 * - Consistent logging interface across client and server environments
 * - OpenTelemetry context integration for distributed tracing
 * - Request context propagation (requestId, traceId, userId)
 * - Configurable log handlers for different output targets
 * - Error reporting with observability fallbacks
 * - Structured logging with metadata support
 * - Environment-aware logging (browser vs server)
 * 
 * This logger provides a unified interface while integrating with
 * the application's observability stack for comprehensive monitoring.
 */

import { getActiveOtelContextAttributes } from '@/shared/lib/observability/otel-context';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';

/**
 * Log level enumeration for consistent severity classification
 */
type LogLevel = 'info' | 'warn' | 'error' | 'log';

/**
 * Log handler function signature for pluggable output targets
 */
export type LogHandler = (
  level: LogLevel,
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
) => void;

/**
 * Request context snapshot for correlation across distributed systems
 */
type RequestContextSnapshot = {
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  userId?: string | null;
};

/**
 * Request context storage reader interface
 */
type RequestContextStorageReader = {
  getStore(): RequestContextSnapshot | undefined;
};

/**
 * Global type extension for request context storage
 */
type RequestContextGlobal = typeof globalThis & {
  __geminitestappRequestContextStorage?: RequestContextStorageReader;
};

// Registry of log handlers for different output targets
const handlers: LogHandler[] = [];

/**
 * Read current request context for correlation
 * Returns undefined in browser environments
 */
const readRequestContext = (): RequestContextSnapshot | undefined => {
  if (typeof window !== 'undefined') {
    return undefined;
  }
  return (globalThis as RequestContextGlobal).__geminitestappRequestContextStorage?.getStore();
};

export const registerLogHandler = (handler: LogHandler): void => {
  handlers.push(handler);
};

const extractPart = (val: string | null | undefined, prefix: string): string => {
  return val !== undefined && val !== null && val.length > 0 ? ` [${prefix}:${val}]` : '';
};

const formatMessage = (
  level: LogLevel,
  message: string,
  _context?: Record<string, unknown>
): string => {
  const timestamp = new Date().toISOString();
  const requestContext = readRequestContext();
  const rid = extractPart(requestContext?.requestId, 'RID');
  const tid = extractPart(requestContext?.traceId, 'TID');
  const cid = extractPart(requestContext?.correlationId, 'CID');
  const uid = extractPart(requestContext?.userId, 'UID');

  // For human readable console output while maintaining parsability
  return `[${timestamp}] [${level.toUpperCase()}]${rid}${tid}${cid}${uid} ${message}`;
};

const SERVICE_PREFIX_PATTERN = /^\[([A-Za-z0-9_.:-]+)\]/;

const readServiceFromMessage = (message: string): string | undefined => {
  const match = message.match(SERVICE_PREFIX_PATTERN);
  const value = match?.[1]?.trim();
  return value !== undefined && value.length > 0 ? value : undefined;
};

const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const withDefaultStringContext = (
  context: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> =>
  hasNonEmptyString(value) && !hasNonEmptyString(context[key])
    ? { ...context, [key]: value }
    : context;

const REQUEST_CONTEXT_KEYS = ['requestId', 'traceId', 'correlationId', 'userId'] as const;
const OTEL_CONTEXT_KEYS = ['otelTraceId', 'otelSpanId', 'otelTraceFlags'] as const;

const applyRequestContext = (
  context: Record<string, unknown>,
  requestContext: RequestContextSnapshot | undefined
): Record<string, unknown> => {
  if (requestContext === undefined) return context;
  return REQUEST_CONTEXT_KEYS.reduce(
    (nextContext, key) => withDefaultStringContext(nextContext, key, requestContext[key]),
    context
  );
};

const applyOtelContext = (
  context: Record<string, unknown>,
  otelContext: Record<string, unknown>
): Record<string, unknown> =>
  OTEL_CONTEXT_KEYS.reduce(
    (nextContext, key) => withDefaultStringContext(nextContext, key, otelContext[key]),
    context
  );

const normalizeContext = (
  message: string,
  context?: Record<string, unknown>
): Record<string, unknown> => {
  let normalized: Record<string, unknown> = {
    ...(context ?? {}),
  };

  if (!hasNonEmptyString(normalized['service'])) {
    const inferredService = readServiceFromMessage(message);
    if (inferredService !== undefined && inferredService.length > 0) {
      normalized = { ...normalized, service: inferredService };
    }
  }

  normalized = applyRequestContext(normalized, readRequestContext());
  normalized = applyOtelContext(normalized, getActiveOtelContextAttributes());

  return normalized;
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>): void => {
    const normalizedContext = normalizeContext(message, context);
    if (handlers.length === 0) {
      // eslint-disable-next-line no-console
      console.info(formatMessage('info', message, normalizedContext), normalizedContext);
    }
    handlers.forEach((h) => h('info', message, undefined, normalizedContext));
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    const normalizedContext = normalizeContext(message, context);
    if (handlers.length === 0) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error(formatMessage('error', message, combinedContext), combinedContext);
    }

    handlers.forEach((h) => h('error', message, error, normalizedContext));

    // Integration with centralized observability (Client-side)
    // Only call if no handlers are registered to prevent duplicate logging
    if (typeof window !== 'undefined' && handlers.length === 0) {
      try {
        const err = error instanceof Error ? error : new Error(message);
        logClientCatch(err, {
          source: 'shared-logger',
          action: 'logger.error',
          message,
          ...combinedContext,
        });
      } catch (fallbackError) {
        reportObservabilityInternalError(fallbackError, {
          source: 'shared.logger',
          action: 'forwardClientError',
          message,
        });
      }
    }
  },
  log: (message: string, context?: Record<string, unknown>): void => {
    const normalizedContext = normalizeContext(message, context);
    if (handlers.length === 0) {
      // eslint-disable-next-line no-console
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
