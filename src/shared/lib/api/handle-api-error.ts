import "server-only";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveError } from "@/shared/errors/resolve-error";
import { getErrorFingerprint, logSystemEvent } from "@/shared/lib/observability/system-logger";
import { validationError } from "@/shared/errors/app-error";

type ApiErrorOptions = {
  request?: Request | undefined;
  source?: string | undefined;
  fallbackMessage?: string | undefined;
  includeDetails?: boolean | undefined;
  extra?: Record<string, unknown> | undefined;
  /** Request ID for tracing (will be included in response headers) */
  requestId?: string | undefined;
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
export const createErrorResponse = (
  error: unknown,
  options?: ApiErrorOptions
) => {
  const resolved = resolveError(error, {
    ...(options?.fallbackMessage ? { fallbackMessage: options.fallbackMessage } : {}),
  });

  const requestId =
    options?.requestId ??
    options?.request?.headers.get("x-request-id") ??
    randomUUID();

  const fingerprint = getErrorFingerprint({
    message: resolved.message,
    source: options?.source ?? "api",
    ...(options?.request ? { request: options.request } : {}),
    statusCode: resolved.httpStatus,
    error,
  });

  // Determine log level based on error type
  const level = resolved.critical ? "error" : resolved.expected ? "warn" : "error";

  // Log the error
  void logSystemEvent({
    level,
    message: resolved.message,
    source: options?.source ?? "api",
    error,
    ...(options?.request ? { request: options.request } : {}),
    requestId,
    statusCode: resolved.httpStatus,
    context: {
      errorId: resolved.errorId,
      code: resolved.code,
      critical: resolved.critical,
      retryable: resolved.retryable,
      ...(resolved.retryAfterMs ? { retryAfterMs: resolved.retryAfterMs } : {}),
      ...(resolved.meta ? { meta: resolved.meta } : {}),
    },
  });

  // Build response payload
  const payload: Record<string, unknown> = {
    error: resolved.message,
    code: resolved.code,
    errorId: resolved.errorId,
    fingerprint,
  };

  // Include retry information for retryable errors
  if (resolved.retryable) {
    payload.retryable = true;
    if (resolved.retryAfterMs) {
      payload.retryAfterMs = resolved.retryAfterMs;
    }
  }

  // Include details for expected errors or when explicitly requested
  if (resolved.expected && resolved.meta) {
    payload.details = resolved.meta;
  } else if (options?.includeDetails && resolved.meta) {
    payload.details = resolved.meta;
  }

  // Merge any extra payload fields
  if (options?.extra) {
    Object.assign(payload, options.extra);
  }

  // Create response
  const response = NextResponse.json(payload, { status: resolved.httpStatus });

  // Set tracking headers
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-error-id", resolved.errorId);
  response.headers.set("x-error-fingerprint", fingerprint);

  // Set Retry-After header for retryable errors
  if (resolved.retryable && resolved.retryAfterMs) {
    // Convert to seconds for HTTP header
    const retryAfterSeconds = Math.ceil(resolved.retryAfterMs / 1000);
    response.headers.set("Retry-After", String(retryAfterSeconds));
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
) => {
  return NextResponse.json(
    {
      error: message,
      code: code ?? "ERROR",
    },
    { status }
  );
};

/**
 * Creates a validation error response from field errors.
 */
export const createValidationErrorResponse = (
  fieldErrors: Record<string, string[]>,
  options?: Pick<ApiErrorOptions, "request" | "source" | "requestId">
) => {
  const error = validationError("Validation failed", { fields: fieldErrors });
  return createErrorResponse(error, options);
};
