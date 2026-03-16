import 'server-only';

import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

import { validationError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { reportError } from '@/shared/utils/observability/report-error';


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
  } catch (error) {
    void ErrorSystem.captureException(error);
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
  const requestId =
    options?.requestId ?? getRequestHeader(options?.request, 'x-request-id') ?? randomUUID();
  const traceId = options?.traceId ?? getRequestHeader(options?.request, 'x-trace-id') ?? randomUUID();
  const correlationId =
    options?.correlationId ??
    getRequestHeader(options?.request, 'x-correlation-id') ??
    requestId;
  const service = options?.service ?? resolveServiceFromSource(options?.source);
  const requestDiagnostics = extractRequestDiagnostics(options?.request);
  const { resolved, userMessage, fingerprint } = await reportError({
    error,
    source: options?.source ?? 'api',
    service,
    ...(options?.request ? { request: options.request } : {}),
    requestId,
    traceId,
    correlationId,
    fallbackMessage: options?.fallbackMessage,
    context: {
      service,
      traceId,
      correlationId,
      ...requestDiagnostics,
    },
  });

  // Build response payload
  const payload: Record<string, unknown> = {
    error: userMessage,
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
  if (fingerprint) {
    response.headers.set('x-error-fingerprint', fingerprint);
  }
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
