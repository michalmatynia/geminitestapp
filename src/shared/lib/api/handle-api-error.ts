import "server-only";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveError } from "@/shared/errors/resolve-error";
import { validationError } from "@/shared/errors/app-error";

// Local type definitions to avoid importing from features layer
type LogSystemEventParams = {
  level: string;
  message: string;
  source: string;
  error?: unknown;
  request?: Request;
  requestId?: string;
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
    // eslint-disable-next-line import/no-restricted-paths
    const { logSystemEvent: realLogSystemEvent } = await import("@/features/observability/server");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    await realLogSystemEvent(params as any);
  } catch (error) {
    console.error('Failed to log system event via observability feature:', error);
    console.log('System event (fallback):', params);
  }
};

const getErrorFingerprint = (params: ErrorFingerprintParams): string => {
  // Simple fingerprint generation
  return `${params.source}-${params.statusCode}-${Date.now()}`;
};

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
): NextResponse => {
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
): NextResponse => {
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
): NextResponse => {
  const error = validationError("Validation failed", { fields: fieldErrors });
  return createErrorResponse(error, options);
};
