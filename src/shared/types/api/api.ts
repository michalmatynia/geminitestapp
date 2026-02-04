import { NextRequest } from "next/server";
import type { ZodSchema } from "zod";
import type { ApiResponse, PaginatedResponse } from "../base";

export type { ApiResponse, PaginatedResponse };

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

export interface ApiHandlerContext {
  requestId: string;
  startTime: number;
  getElapsedMs: () => number;
  params?: Record<string, string | string[]>;
  body?: unknown;
  rateLimitHeaders?: Record<string, string>;
}

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  allowedMethods?: string[];
  source: string;
  logSuccess?: boolean;
  successLogLevel?: "info" | "warn" | "error";
  fallbackMessage?: string;
  includeDetails?: boolean;
  /**
   * Optional Cache-Control override for this route.
   * If omitted, default cache headers are applied based on HTTP method.
   */
  cacheControl?: string;
  /**
   * Apply a shared rate limit bucket. Set to false to disable.
   */
  rateLimitKey?: false | "api" | "auth" | "write" | "upload" | "search";
  /**
   * Reject JSON bodies over this size (in bytes). Only applies to JSON requests.
   */
  maxBodyBytes?: number;
  /**
   * Parse JSON body and attach it to context.body.
   */
  parseJsonBody?: boolean;
  /**
   * Optional Zod schema to validate parsed JSON body.
   */
  bodySchema?: ZodSchema;
  /**
   * Enforce CSRF token validation for state-changing requests.
   * Defaults to true for unsafe methods when a session cookie is present.
   */
  requireCsrf?: boolean;
}

export type ApiRouteHandler = (
  req: NextRequest,
  context: ApiHandlerContext
) => Promise<Response>;

export type ApiRouteHandlerWithParams<P extends Record<string, string | string[]>> = (
  req: NextRequest,
  context: ApiHandlerContext,
  params: P
) => Promise<Response>;


export type JsonParseResult<T = unknown> =
  | { ok: true; data: T; response?: Response | undefined }
  | { ok: false; response: Response; data?: undefined };

export interface ParseJsonOptions {
  maxSize?: number;
  allowEmpty?: boolean;
  logPrefix?: string;
}
