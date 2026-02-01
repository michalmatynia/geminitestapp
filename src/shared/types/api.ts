import { NextRequest } from "next/server";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
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
  params?: Record<string, string | string[]>;
}

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  allowedMethods?: string[];
}

export type ApiRouteHandler = (
  req: NextRequest,
  context?: ApiHandlerContext
) => Promise<Response>;

export type ApiRouteHandlerWithParams = (
  req: NextRequest,
  context: ApiHandlerContext,
  params: Record<string, string>
) => Promise<Response>;

export interface JsonParseResult<T = any> {
  ok: boolean;
  data?: T;
  response?: Response;
}

export interface ParseJsonOptions {
  maxSize?: number;
  allowEmpty?: boolean;
}