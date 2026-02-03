import { NextRequest } from "next/server";
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
