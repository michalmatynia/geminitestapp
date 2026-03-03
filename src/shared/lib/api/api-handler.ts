import 'server-only';

import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import type {
  ApiHandlerOptions,
  ApiHandlerContext,
  ApiRouteHandler,
  ApiRouteHandlerWithParams,
} from '@/shared/contracts/ui';
import {
  badRequestError,
  forbiddenError,
  methodNotAllowedError,
  payloadTooLargeError,
  validationError,
} from '@/shared/errors/app-error';
import { resolveError } from '@/shared/errors/resolve-error';
import { enforceRateLimit } from '@/shared/lib/api/rate-limit';
import { getActiveOtelContextAttributes } from '@/shared/lib/observability/otel-context';
import { runWithContext } from '@/shared/lib/observability/request-context';
import {
  CSRF_COOKIE_NAME,
  CSRF_SAFE_METHODS,
  getCsrfTokenFromHeaders,
  isSameOriginRequest,
} from '@/shared/lib/security/csrf';
import { logger } from '@/shared/utils/logger';

import type { ZodSchema } from 'zod';

const shouldSkipRateLimitInTestEnv = (request: NextRequest): boolean => {
  if (process.env['NODE_ENV'] !== 'test') return false;
  if (process.env['ENFORCE_TEST_RATE_LIMITS'] === 'true') return false;
  try {
    const hostname = new URL(request.url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
};

const shouldEnforceRateLimit = (request: NextRequest): boolean => {
  if (process.env['DISABLE_RATE_LIMITS'] === 'true') return false;
  if (shouldSkipRateLimitInTestEnv(request)) return false;
  if (process.env['NODE_ENV'] === 'development') {
    return process.env['ENABLE_RATE_LIMITS'] === 'true';
  }
  return true;
};

// Local type definitions to avoid importing from features layer
type LogSystemEventParams = {
  level: SystemLogLevel;
  message: string;
  source: string;
  service?: string;
  error?: unknown;
  request?: NextRequest;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
};

type ErrorFingerprintParams = {
  message: string;
  source: string;
  request: NextRequest;
  statusCode: number;
  error: unknown;
};

const DEFAULT_SLOW_SUCCESS_THRESHOLD_MS = 750;

const readHeaderTrimmed = (request: NextRequest, key: string): string | null => {
  const value = request.headers.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveServiceFromSource = (source: string): string => {
  const trimmed = source.trim();
  if (!trimmed) return 'api.unknown';
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
  return 'api.unknown';
};

const resolveSuccessLoggingPolicy = (options: ApiHandlerOptions): 'all' | 'slow' | 'off' => {
  if (options.successLogging) return options.successLogging;
  if (options.logSuccess === true) return 'all';
  if (options.logSuccess === false) return 'off';
  return 'slow';
};

// Real implementations from features layer via dynamic imports to avoid circular dependencies
const logSystemEvent = async (params: LogSystemEventParams): Promise<void> => {
  try {
    const { logSystemEvent: realLogSystemEvent } =
      await import('@/shared/lib/observability/system-logger');
    await realLogSystemEvent(params);
  } catch (error) {
    logger.error('Failed to log system event via observability feature', error, {
      service: 'api.handler',
      context: params,
    });
  }
};

const getErrorFingerprint = async (params: ErrorFingerprintParams): Promise<string> => {
  try {
    const { getErrorFingerprint: realGetFingerprint } =
      await import('@/shared/lib/observability/system-logger');
    return realGetFingerprint(params);
  } catch (error) {
    logger.error('Failed to get error fingerprint via observability feature', error, {
      service: 'api.handler',
      context: params,
    });
    return `${params.source}-${params.statusCode}-${Date.now()}`;
  }
};

const getSessionUser = async (): Promise<{ id?: string | null } | null> => {
  try {
    const { auth } = await import('@/features/auth/auth');
    const session = await auth();
    return session?.user ?? null;
  } catch {
    return null;
  }
};

export type { ApiHandlerOptions, ApiHandlerContext, ApiRouteHandler, ApiRouteHandlerWithParams };

type ParsedBodyResult = {
  body: unknown;
};

const DEFAULT_JSON_BODY_BYTES = 1_000_000;

const shouldSkipCsrfInTestEnv = (request: NextRequest): boolean => {
  if (process.env['NODE_ENV'] !== 'test') return false;
  if (process.env['ENFORCE_TEST_CSRF'] === 'true') return false;
  try {
    const hostname = new URL(request.url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
};

const enforceCsrf = (request: NextRequest, options: ApiHandlerOptions): void => {
  const method = request.method.toUpperCase();
  if (CSRF_SAFE_METHODS.has(method)) return;
  const shouldRequire = options.requireCsrf !== false;
  if (!shouldRequire) return;
  if (shouldSkipCsrfInTestEnv(request)) return;
  if (!isSameOriginRequest(request)) {
    throw forbiddenError('Invalid request origin.');
  }
  const headerToken = getCsrfTokenFromHeaders(request)?.trim() || null;
  if (!headerToken) {
    throw forbiddenError('Invalid CSRF token.');
  }
  const cookieTokens = request.cookies
    .getAll(CSRF_COOKIE_NAME)
    .map((cookie: { value: string }) => cookie.value?.trim())
    .filter((token: string | undefined): token is string => Boolean(token));

  // Prefer strict double-submit validation when cookie exists.
  // If cookie is temporarily absent but request is same-origin and header is present,
  // accept to avoid false negatives in dev/proxy edge cases.
  if (cookieTokens.length > 0 && !cookieTokens.includes(headerToken)) {
    throw forbiddenError('Invalid CSRF token.');
  }
};

const isJsonRequest = (request: NextRequest): boolean => {
  const contentType = request.headers.get('content-type') ?? '';
  return contentType.includes('application/json');
};

const parseJsonBody = async (
  request: NextRequest,
  options: { maxBodyBytes: number; schema?: ZodSchema | undefined }
): Promise<ParsedBodyResult> => {
  if (!isJsonRequest(request)) {
    return { body: undefined };
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > options.maxBodyBytes) {
    throw payloadTooLargeError('Payload too large', { limit: options.maxBodyBytes });
  }

  const clone = request.clone();
  const text = await clone.text();
  if (text.length > options.maxBodyBytes) {
    throw payloadTooLargeError('Payload too large', { limit: options.maxBodyBytes });
  }

  if (!text.trim()) {
    return { body: undefined };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw badRequestError('Invalid JSON payload');
  }

  if (options.schema) {
    const validation = options.schema.safeParse(parsed);
    if (!validation.success) {
      throw validationError('Validation failed', { issues: validation.error.flatten() });
    }
    return { body: validation.data };
  }

  return { body: parsed };
};

const applySecurityHeaders = (response: Response): void => {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
};

/**
 * Wraps an API route handler with automatic error handling, logging, and request tracking.
 *
 * Features:
 * - Automatic error catching and standardized error responses
 * - Request ID generation and tracking
 * - Performance timing
 * - Structured logging for both errors and successes
 * - Consistent error response format
 *
 * @example
 * ```ts
 * export const GET = apiHandler(
 *   async (req, ctx) => {
 *     const data = await fetchData();
 *     return NextResponse.json(data);
 *   },
 *   { source: "products.GET" }
 * );
 * ```
 */
export function apiHandler(
  handler: ApiRouteHandler,
  options: ApiHandlerOptions
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      throw methodNotAllowedError(`Method ${request.method} not allowed`, {
        allowedMethods: options.allowedMethods,
      });
    }

    const requestId = readHeaderTrimmed(request, 'x-request-id') ?? randomUUID();
    const traceId = readHeaderTrimmed(request, 'x-trace-id') ?? randomUUID();
    const correlationId = readHeaderTrimmed(request, 'x-correlation-id') ?? requestId;
    const service = options.service?.trim() || resolveServiceFromSource(options.source);
    const startTime = performance.now();
    const user = await getSessionUser();

    const context: ApiHandlerContext = {
      requestId,
      traceId,
      correlationId,
      startTime,
      userId: user?.id ?? null,
      getElapsedMs: (): number => Math.round(performance.now() - startTime),
    };

    return runWithContext(
      {
        requestId,
        traceId,
        correlationId,
        startTime,
        userId: context.userId ?? null,
      },
      async () => {
        try {
          enforceCsrf(request, options);

          let rateLimitHeaders: Record<string, string> | undefined;
          const rateKey = options.rateLimitKey === false ? null : (options.rateLimitKey ?? 'api');
          if (rateKey && shouldEnforceRateLimit(request)) {
            const rateResult = await enforceRateLimit(request, rateKey);
            rateLimitHeaders = rateResult.headers;
            context.rateLimitHeaders = rateLimitHeaders;
          }
          if (options.parseJsonBody) {
            const parsed = await parseJsonBody(request, {
              maxBodyBytes: options.maxBodyBytes ?? DEFAULT_JSON_BODY_BYTES,
              schema: options.bodySchema,
            });
            context.body = parsed.body;
          }

          if (options.querySchema) {
            const queryParams = Object.fromEntries(new URL(request.url).searchParams.entries());
            const validation = options.querySchema.safeParse(queryParams);
            if (!validation.success) {
              throw validationError('Query validation failed', {
                issues: validation.error.flatten(),
              });
            }
            context.query = validation.data;
          }

          const response = await handler(request, context);

          const durationMs = context.getElapsedMs();
          const successPolicy = resolveSuccessLoggingPolicy(options);
          const slowSuccessThresholdMs =
          options.slowSuccessThresholdMs ?? DEFAULT_SLOW_SUCCESS_THRESHOLD_MS;
          const shouldLogSuccess =
          successPolicy === 'all' ||
          (successPolicy === 'slow' && durationMs >= slowSuccessThresholdMs);

          if (shouldLogSuccess) {
            const otelContext = getActiveOtelContextAttributes();
            void logSystemEvent({
              level: options.successLogLevel ?? 'info',
              message: `${options.source} completed successfully`,
              source: options.source,
              service,
              request,
              requestId,
              traceId,
              correlationId,
              statusCode: response.status,
              context: {
                durationMs,
                successPolicy,
                slowSuccessThresholdMs,
                ...otelContext,
              },
            });
          }

          // Add request ID to response headers for client-side tracking
          if (!response.headers.has('x-request-id')) {
            response.headers.set('x-request-id', requestId);
          }
          if (!response.headers.has('x-trace-id')) {
            response.headers.set('x-trace-id', traceId);
          }
          if (!response.headers.has('x-correlation-id')) {
            response.headers.set('x-correlation-id', correlationId);
          }
          if (context.rateLimitHeaders) {
            Object.entries(context.rateLimitHeaders).forEach(([key, value]: [string, string]) => {
              response.headers.set(key, value);
            });
          }
          applySecurityHeaders(response);
          applyDefaultCacheHeaders(response, request.method, options.cacheControl);
          return response;
        } catch (error) {
          const response = await createErrorResponseWithTiming(error, request, context, options);
          if (context.rateLimitHeaders) {
            Object.entries(context.rateLimitHeaders).forEach(([key, value]: [string, string]) => {
              response.headers.set(key, value);
            });
          }
          applySecurityHeaders(response);
          return response;
        }
      }
    );
  };
}

/**
 * Wraps an API route handler with params (for dynamic routes like [id]).
 *
 * @example
 * ```ts
 * export const GET = apiHandlerWithParams<{ id: string }>(
 *   async (req, ctx, params) => {
 *     const item = await getById(params.id);
 *     return NextResponse.json(item);
 *   },
 *   { source: "products/[id].GET" }
 * );
 * ```
 */
export function apiHandlerWithParams<P extends Record<string, string | string[]>>(
  handler: ApiRouteHandlerWithParams<P>,
  options: ApiHandlerOptions
): (request: NextRequest, context: { params: Promise<P> }) => Promise<Response> {
  return async (request: NextRequest, routeContext: { params: Promise<P> }) => {
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      throw methodNotAllowedError(`Method ${request.method} not allowed`, {
        allowedMethods: options.allowedMethods,
      });
    }

    const requestId = readHeaderTrimmed(request, 'x-request-id') ?? randomUUID();
    const traceId = readHeaderTrimmed(request, 'x-trace-id') ?? randomUUID();
    const correlationId = readHeaderTrimmed(request, 'x-correlation-id') ?? requestId;
    const service = options.service?.trim() || resolveServiceFromSource(options.source);
    const startTime = performance.now();
    const user = await getSessionUser();

    const handlerContext: ApiHandlerContext = {
      requestId,
      traceId,
      correlationId,
      startTime,
      userId: user?.id ?? null,
      getElapsedMs: () => Math.round(performance.now() - startTime),
    };

    return runWithContext(
      {
        requestId,
        traceId,
        correlationId,
        startTime,
        userId: handlerContext.userId ?? null,
      },
      async () => {
        try {
          enforceCsrf(request, options);

          let rateLimitHeaders: Record<string, string> | undefined;
          const rateKey = options.rateLimitKey === false ? null : (options.rateLimitKey ?? 'api');
          if (rateKey && shouldEnforceRateLimit(request)) {
            const rateResult = await enforceRateLimit(request, rateKey);
            rateLimitHeaders = rateResult.headers;
            handlerContext.rateLimitHeaders = rateLimitHeaders;
          }
          if (options.parseJsonBody) {
            const parsed = await parseJsonBody(request, {
              maxBodyBytes: options.maxBodyBytes ?? DEFAULT_JSON_BODY_BYTES,
              schema: options.bodySchema,
            });
            handlerContext.body = parsed.body;
          }

          if (options.querySchema) {
            const queryParams = Object.fromEntries(new URL(request.url).searchParams.entries());
            const validation = options.querySchema.safeParse(queryParams);
            if (!validation.success) {
              throw validationError('Query validation failed', {
                issues: validation.error.flatten(),
              });
            }
            handlerContext.query = validation.data;
          }

          const params = await routeContext.params;

          if (options.paramsSchema) {
            const validation = options.paramsSchema.safeParse(params);
            if (!validation.success) {
              throw validationError('Parameter validation failed', {
                issues: validation.error.flatten(),
              });
            }
          }

          const response = await handler(request, handlerContext, params);

          const durationMs = handlerContext.getElapsedMs();
          const successPolicy = resolveSuccessLoggingPolicy(options);
          const slowSuccessThresholdMs =
            options.slowSuccessThresholdMs ?? DEFAULT_SLOW_SUCCESS_THRESHOLD_MS;
          const shouldLogSuccess =
            successPolicy === 'all' ||
            (successPolicy === 'slow' && durationMs >= slowSuccessThresholdMs);

          if (shouldLogSuccess) {
            const otelContext = getActiveOtelContextAttributes();
            void logSystemEvent({
              level: options.successLogLevel ?? 'info',
              message: `${options.source} completed successfully`,
              source: options.source,
              service,
              request,
              requestId,
              traceId,
              correlationId,
              statusCode: response.status,
              context: {
                durationMs,
                successPolicy,
                slowSuccessThresholdMs,
                params,
                ...otelContext,
              },
            });
          }

          if (!response.headers.has('x-request-id')) {
            response.headers.set('x-request-id', requestId);
          }
          if (!response.headers.has('x-trace-id')) {
            response.headers.set('x-trace-id', traceId);
          }
          if (!response.headers.has('x-correlation-id')) {
            response.headers.set('x-correlation-id', correlationId);
          }
          if (handlerContext.rateLimitHeaders) {
            Object.entries(handlerContext.rateLimitHeaders).forEach(
              ([key, value]: [string, string]) => {
                response.headers.set(key, value);
              }
            );
          }
          applySecurityHeaders(response);
          applyDefaultCacheHeaders(response, request.method, options.cacheControl);
          return response;
        } catch (error) {
          const response = await createErrorResponseWithTiming(
            error,
            request,
            handlerContext,
            options
          );
          if (handlerContext.rateLimitHeaders) {
            Object.entries(handlerContext.rateLimitHeaders).forEach(
              ([key, value]: [string, string]) => {
                response.headers.set(key, value);
              }
            );
          }
          applySecurityHeaders(response);
          return response;
        }
      }
    );
  };
}

const DEFAULT_GET_CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300';
const MAX_QUERY_KEYS = 20;
const MAX_BODY_KEYS = 20;

function applyDefaultCacheHeaders(response: Response, method: string, override?: string): void {
  if (response.headers.has('Cache-Control')) return;
  if (override?.trim()) {
    response.headers.set('Cache-Control', override.trim());
    return;
  }
  const isGetLike = method === 'GET' || method === 'HEAD';
  if (isGetLike) {
    response.headers.set('Cache-Control', DEFAULT_GET_CACHE_CONTROL);
    return;
  }
  response.headers.set('Cache-Control', 'no-store');
}

const getQueryKeys = (request: NextRequest): string[] => {
  try {
    return Array.from(new URL(request.url).searchParams.keys()).slice(0, MAX_QUERY_KEYS);
  } catch {
    return [];
  }
};

const summarizeBodyShape = (value: unknown): Record<string, unknown> => {
  if (value === null) return { type: 'null' };
  if (value === undefined) return { type: 'undefined' };
  if (Array.isArray(value)) {
    return { type: 'array', length: value.length };
  }
  if (typeof value === 'string') {
    return { type: 'string', length: value.length };
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { type: typeof value };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return {
      type: 'object',
      keyCount: keys.length,
      keys: keys.slice(0, MAX_BODY_KEYS),
    };
  }
  return { type: typeof value };
};

/**
 * Creates an error response with timing information and logging.
 */
async function createErrorResponseWithTiming(
  error: unknown,
  request: NextRequest,
  context: ApiHandlerContext,
  options: ApiHandlerOptions
): Promise<Response> {
  const resolved = resolveError(error, {
    ...(options.fallbackMessage !== undefined && { fallbackMessage: options.fallbackMessage }),
  });

  const level: SystemLogLevel = resolved.expected ? 'warn' : 'error';
  const durationMs = context.getElapsedMs();
  const routePath = (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return null;
    }
  })();
  const queryKeys = getQueryKeys(request);
  const bodyShape = context.body !== undefined ? summarizeBodyShape(context.body) : null;
  const service = options.service?.trim() || resolveServiceFromSource(options.source);
  const otelContext = getActiveOtelContextAttributes();

  // Log the error with full context
  void logSystemEvent({
    level,
    message: resolved.message,
    source: options.source,
    service,
    error,
    request,
    requestId: context.requestId,
    traceId: context.traceId,
    correlationId: context.correlationId,
    statusCode: resolved.httpStatus,
    context: {
      errorId: resolved.errorId,
      code: resolved.code,
      category: resolved.category,
      durationMs,
      source: options.source,
      route: routePath,
      method: request.method,
      traceId: context.traceId,
      correlationId: context.correlationId,
      ...otelContext,
      service,
      expected: resolved.expected,
      critical: resolved.critical,
      retryable: resolved.retryable,
      ...(bodyShape ? { bodyShape } : {}),
      ...(queryKeys.length > 0 ? { queryKeys } : {}),
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
  };

  const fingerprint = await getErrorFingerprint({
    message: resolved.message,
    source: options.source,
    request,
    statusCode: resolved.httpStatus,
    error,
  });

  payload['fingerprint'] = fingerprint;

  if (resolved.retryable) {
    payload['retryable'] = true;
    if (resolved.retryAfterMs) {
      payload['retryAfterMs'] = resolved.retryAfterMs;
    }
  }

  if (resolved.expected && resolved.meta) {
    payload['details'] = resolved.meta;
  } else if (options.includeDetails && resolved.meta) {
    payload['details'] = resolved.meta;
  }

  const response = NextResponse.json(payload, { status: resolved.httpStatus });
  response.headers.set('x-request-id', context.requestId);
  response.headers.set('x-trace-id', context.traceId);
  response.headers.set('x-correlation-id', context.correlationId);
  response.headers.set('x-error-id', resolved.errorId);
  response.headers.set('x-error-fingerprint', fingerprint);

  if (resolved.retryable && resolved.retryAfterMs) {
    const retryAfterSeconds = Math.ceil(resolved.retryAfterMs / 1000);
    response.headers.set('Retry-After', String(retryAfterSeconds));
  }

  return response;
}

/**
 * Helper to extract common query parameters.
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  return new URL(request.url).searchParams;
}

/**
 * Helper to get a required query parameter, throws if missing.
 */
export function getRequiredParam(searchParams: URLSearchParams, name: string): string {
  const value = searchParams.get(name);
  if (!value) {
    throw badRequestError(`Missing required parameter: ${name}`);
  }
  return value;
}

/**
 * Helper to parse pagination parameters.
 */
export function getPaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}
