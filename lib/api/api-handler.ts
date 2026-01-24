import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveError } from "@/lib/errors/resolve-error";
import { logSystemEvent } from "@/lib/services/system-logger";
import type { SystemLogLevel } from "@/types";

/**
 * Configuration options for the API handler wrapper.
 */
export type ApiHandlerOptions = {
  /** Identifier for logging purposes (e.g., "products.GET") */
  source: string;
  /** Default error message if error doesn't provide one */
  fallbackMessage?: string;
  /** Whether to include error details in response (use cautiously in production) */
  includeDetails?: boolean;
  /** Whether to log successful requests */
  logSuccess?: boolean;
  /** Custom success log level */
  successLogLevel?: SystemLogLevel;
};

/**
 * Result of API handler execution including timing and request ID.
 */
export type ApiHandlerContext = {
  /** Unique request identifier for tracing */
  requestId: string;
  /** Start time for performance measurement */
  startTime: number;
  /** Get elapsed time in milliseconds */
  getElapsedMs: () => number;
};

/**
 * Type for API route handler functions.
 */
export type ApiRouteHandler = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<NextResponse>;

/**
 * Type for dynamic route handler with params.
 */
export type ApiRouteHandlerWithParams<P extends Record<string, string>> = (
  request: NextRequest,
  context: ApiHandlerContext,
  params: P
) => Promise<NextResponse>;

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
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const startTime = performance.now();

    const context: ApiHandlerContext = {
      requestId,
      startTime,
      getElapsedMs: () => Math.round(performance.now() - startTime),
    };

    try {
      const response = await handler(request, context);

      // Log successful requests if configured
      if (options.logSuccess) {
        void logSystemEvent({
          level: options.successLogLevel ?? "info",
          message: `${options.source} completed successfully`,
          source: options.source,
          request,
          requestId,
          statusCode: response.status,
          context: {
            durationMs: context.getElapsedMs(),
          },
        });
      }

      // Add request ID to response headers for client-side tracking
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      return createErrorResponseWithTiming(error, request, context, options);
    }
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
export function apiHandlerWithParams<P extends Record<string, string>>(
  handler: ApiRouteHandlerWithParams<P>,
  options: ApiHandlerOptions
): (
  request: NextRequest,
  context: { params: Promise<P> }
) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext: { params: Promise<P> }) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const startTime = performance.now();

    const handlerContext: ApiHandlerContext = {
      requestId,
      startTime,
      getElapsedMs: () => Math.round(performance.now() - startTime),
    };

    try {
      const params = await routeContext.params;
      const response = await handler(request, handlerContext, params);

      if (options.logSuccess) {
        void logSystemEvent({
          level: options.successLogLevel ?? "info",
          message: `${options.source} completed successfully`,
          source: options.source,
          request,
          requestId,
          statusCode: response.status,
          context: {
            durationMs: handlerContext.getElapsedMs(),
            params,
          },
        });
      }

      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      return createErrorResponseWithTiming(
        error,
        request,
        handlerContext,
        options
      );
    }
  };
}

/**
 * Creates an error response with timing information and logging.
 */
function createErrorResponseWithTiming(
  error: unknown,
  request: NextRequest,
  context: ApiHandlerContext,
  options: ApiHandlerOptions
): NextResponse {
  const resolved = resolveError(error, {
    ...(options.fallbackMessage !== undefined && { fallbackMessage: options.fallbackMessage }),
  });

  const level: SystemLogLevel = resolved.expected ? "warn" : "error";
  const durationMs = context.getElapsedMs();

  // Log the error with full context
  void logSystemEvent({
    level,
    message: resolved.message,
    source: options.source,
    error,
    request,
    requestId: context.requestId,
    statusCode: resolved.httpStatus,
    context: {
      errorId: resolved.errorId,
      code: resolved.code,
      durationMs,
      ...(resolved.meta ? { meta: resolved.meta } : {}),
    },
  });

  // Build response payload
  const payload: Record<string, unknown> = {
    error: resolved.message,
    code: resolved.code,
    errorId: resolved.errorId,
  };

  if (resolved.expected && resolved.meta) {
    payload.details = resolved.meta;
  } else if (options.includeDetails && resolved.meta) {
    payload.details = resolved.meta;
  }

  const response = NextResponse.json(payload, { status: resolved.httpStatus });
  response.headers.set("x-request-id", context.requestId);
  response.headers.set("x-error-id", resolved.errorId);

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
export function getRequiredParam(
  searchParams: URLSearchParams,
  name: string
): string {
  const value = searchParams.get(name);
  if (!value) {
    const { badRequestError } = require("@/lib/errors/app-error");
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
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}
