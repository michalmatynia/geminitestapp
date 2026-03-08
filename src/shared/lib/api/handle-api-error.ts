import 'server-only';

import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

import { validationError } from '@/shared/errors/app-error';
import { resolveError } from '@/shared/errors/resolve-error';
import { logger } from '@/shared/utils/logger';
import type { SystemLogLevelDto } from '@/shared/contracts/observability';

// Local type definitions to avoid importing from features layer
type LogSystemEventParams = {
  level: SystemLogLevelDto | string;
  message: string;
  source: string;
  service?: string;
  error?: unknown;
  request?: Request;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
};

type ErrorFingerprintParams = {
  message: string;
  source: string;
  request?: Request;
  statusCode: number;
  error: unknown;
};

// Stub implementations to avoid features layer dependency
const logSystemEvent = async (params: LogSystemEventParams): Promise<void> => {
  try {
    // Dynamically import to avoid circular dependency (shared -> features -> shared)
    const mod = (await import('@/shared/lib/observability/system-logger')) as {
      logSystemEvent: (input: LogSystemEventParams) => Promise<void>;
      getErrorFingerprint: (input: ErrorFingerprintParams) => string;
    };

    await mod.logSystemEvent(params);
  } catch (error) {
    logger.error('Failed to log system event via observability feature', error, {
      service: 'api.error-handler',
      context: params,
    });
  }
};

const getErrorFingerprint = async (params: ErrorFingerprintParams): Promise<string> => {
  try {
    const mod = (await import('@/shared/lib/observability/system-logger')) as {
      getErrorFingerprint: (input: ErrorFingerprintParams) => string;
    };
    return mod.getErrorFingerprint(params);
  } catch (error) {
    logger.error('Failed to get error fingerprint via observability feature', error, {
      service: 'api.error-handler',
      context: params,
    });
    return `${params.source}-${params.statusCode}-${Date.now()}`;
  }
};

type ApiErrorOptions = {
  request?: Request | undefined;
  source?: string | undefined;
  service?: string | undefined;
  fallbackMessage?: string | undefined;
  includeDetails?: boolean | undefined;
  extra?: Record<string, unknown> | undefined;
  /** Request ID for tracing (will be included in response headers) */
  requestId?: string | undefined;
  traceId?: string | undefined;
  correlationId?: string | undefined;
};

const MAX_QUERY_KEYS = 20;

const getRequestHeader = (request: Request | undefined, name: string): string | null => {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== 'function') {
    return null;
  }

  try {
    return headers.get(name);
  } catch {
    return null;
  }
};

const resolveServiceFromSource = (source: string | undefined): string => {
  const trimmed = source?.trim() ?? '';
  if (!trimmed) return 'api.error';
  const segments = trimmed.split('.').filter(Boolean);
  const maybeMethod = segments[segments.length - 1];
  const isMethod =
    maybeMethod === 'GET' ||
    maybeMethod === 'POST' ||
    maybeMethod === 'PUT' ||
    maybeMethod === 'PATCH' ||
    maybeMethod === 'DELETE' ||
    maybeMethod === 'HEAD' ||
    maybeMethod === 'OPTIONS';
  const base = isMethod ? segments.slice(0, -1) : segments;
  const first = base[0];
  const second = base[1];
  if (first && second) return `${first}.${second}`;
  if (first) return first;
  return 'api.error';
};

const extractRequestDiagnostics = (
  request: Request | undefined
): {
  route?: string;
  method?: string;
  queryKeys?: string[];
} => {
  if (!request) return {};
  try {
    const url = new URL(request.url);
    const queryKeys = Array.from(url.searchParams.keys()).slice(0, MAX_QUERY_KEYS);
    return {
      route: url.pathname,
      method: request.method,
      ...(queryKeys.length > 0 ? { queryKeys } : {}),
    };
  } catch {
    return {
      method: request.method,
    };
  }
};

/**
 * Creates a standardized error response with logging.
 *
 * Features:
 * - Resolves any error to a standardized format
 * - Logs to system log with appropriate level
 * - Includes retry information for retryable errors
 * - Sets appropriate headers (x-request-id, x-error-id, Retry-After)
 * - Differentiates between expected (user) and unexpected (server) errors
 */
export const createErrorResponse = async (
  error: unknown,
  options?: ApiErrorOptions
): Promise<NextResponse> => {
  const resolved = resolveError(error, {
    ...(options?.fallbackMessage ? { fallbackMessage: options.fallbackMessage } : {}),
  });

  const requestId =
    options?.requestId ?? getRequestHeader(options?.request, 'x-request-id') ?? randomUUID();
  const traceId = options?.traceId ?? getRequestHeader(options?.request, 'x-trace-id') ?? randomUUID();
  const correlationId =
    options?.correlationId ??
    getRequestHeader(options?.request, 'x-correlation-id') ??
    requestId;
  const service = options?.service ?? resolveServiceFromSource(options?.source);

  const fingerprint = await getErrorFingerprint({
    message: resolved.message,
    source: options?.source ?? 'api',
    ...(options?.request ? { request: options.request } : {}),
    statusCode: resolved.httpStatus,
    error,
  });

  // Determine log level based on error type
  const level = resolved.critical ? 'error' : resolved.expected ? 'warn' : 'error';
  const requestDiagnostics = extractRequestDiagnostics(options?.request);

  // Log the error
  void logSystemEvent({
    level,
    message: resolved.message,
    source: options?.source ?? 'api',
    service,
    error,
    ...(options?.request ? { request: options.request } : {}),
    requestId,
    traceId,
    correlationId,
    statusCode: resolved.httpStatus,
    context: {
      errorId: resolved.errorId,
      code: resolved.code,
      category: resolved.category,
      critical: resolved.critical,
      retryable: resolved.retryable,
      expected: resolved.expected,
      service,
      traceId,
      correlationId,
      ...requestDiagnostics,
      ...(resolved.retryAfterMs ? { retryAfterMs: resolved.retryAfterMs } : {}),
      ...(resolved.meta ? { meta: resolved.meta } : {}),
    },
  });

  // Build response payload
  const payload: Record<string, unknown> = {
    error: resolved.message,
    code: resolved.code,
    errorId: resolved.errorId,
    category: resolved.category,
    suggestedActions: resolved.suggestedActions,
    fingerprint,
  };

  // Include retry information for retryable errors
  if (resolved.retryable) {
    payload['retryable'] = true;
    if (resolved.retryAfterMs) {
      payload['retryAfterMs'] = resolved.retryAfterMs;
    }
  }

  // Include details for expected errors or when explicitly requested
  if (resolved.expected && resolved.meta) {
    payload['details'] = resolved.meta;
  } else if (options?.includeDetails && resolved.meta) {
    payload['details'] = resolved.meta;
  }

  // Merge any extra payload fields
  if (options?.extra) {
    Object.assign(payload, options.extra);
  }

  // Create response
  const response = NextResponse.json(payload, { status: resolved.httpStatus });

  // Set tracking headers
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-trace-id', traceId);
  response.headers.set('x-correlation-id', correlationId);
  response.headers.set('x-error-id', resolved.errorId);
  response.headers.set('x-error-fingerprint', fingerprint);
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store');
  }

  // Set Retry-After header for retryable errors
  if (resolved.retryable && resolved.retryAfterMs) {
    // Convert to seconds for HTTP header
    const retryAfterSeconds = Math.ceil(resolved.retryAfterMs / 1000);
    response.headers.set('Retry-After', String(retryAfterSeconds));
  }

  return response;
};

/**
 * Creates a simple error response without logging.
 * Use sparingly - prefer createErrorResponse for proper tracing.
 */
export const createSimpleErrorResponse = (
  message: string,
  status: number,
  code?: string
): NextResponse => {
  const response = NextResponse.json(
    {
      error: message,
      code: code ?? 'ERROR',
    },
    { status }
  );
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
};

/**
 * Creates a validation error response from field errors.
 */
export const createValidationErrorResponse = async (
  fieldErrors: Record<string, string[]>,
  options?: Pick<
    ApiErrorOptions,
    'request' | 'source' | 'service' | 'requestId' | 'traceId' | 'correlationId'
  >
): Promise<NextResponse> => {
  const error = validationError('Validation failed', { fields: fieldErrors });
  return await createErrorResponse(error, options);
};
