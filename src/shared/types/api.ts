import { NextRequest } from "next/server";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}

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