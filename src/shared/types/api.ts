import type { NextRequest } from "next/server";
import type { SystemLogLevel } from "@/shared/types/system-logs";

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
) => Promise<Response>;

/**
 * Type for dynamic route handler with params.
 */
export type ApiRouteHandlerWithParams<P extends Record<string, string>> = (
  request: NextRequest,
  context: ApiHandlerContext,
  params: P
) => Promise<Response>;

export type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export type ParseJsonOptions = {
  logPrefix?: string;
  allowEmpty?: boolean;
};

/**
 * Standard response shape for successful DELETE operations.
 */
export type DeleteResponse = { success: true };
