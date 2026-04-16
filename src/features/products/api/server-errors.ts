import 'server-only';

import { NextRequest } from 'next/server';

import { AppError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { ApiErrorBuilder, ErrorStatusCodes, createVersionedErrorResponse } from './errors';

type RequestDiagnostics = {
  requestId?: string | undefined;
  method?: string | undefined;
  route?: string | undefined;
  queryKeys?: string[] | undefined;
};

function extractRequestDiagnostics(args: unknown[]): RequestDiagnostics {
  const request = args[0];
  if (!(request instanceof NextRequest)) return {};
  try {
    const url = new URL(request.url);
    const queryKeys = Array.from(url.searchParams.keys()).slice(0, 20);
    const requestId = request.headers.get('x-request-id');
    return {
      requestId: typeof requestId === 'string' && requestId !== '' ? requestId : undefined,
      method: request.method,
      route: url.pathname,
      ...(queryKeys.length > 0 ? { queryKeys } : {}),
    };
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => { /* silent */ });
    const requestId = request.headers.get('x-request-id');
    return {
      requestId: typeof requestId === 'string' && requestId !== '' ? requestId : undefined,
      method: request.method,
    };
  }
}

function resolveHttpStatus(error: unknown): number {
  if (error instanceof ApiErrorBuilder) {
    const code = error.build().error.code;
    return ErrorStatusCodes[code] ?? 500;
  }
  if (error instanceof AppError) {
    return error.httpStatus;
  }
  return 500;
}

// Middleware for consistent error handling
export function withErrorHandling<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      ErrorSystem.captureException(error).catch(() => { /* silent */ });
      const diagnostics = extractRequestDiagnostics(args);
      
      await ErrorSystem.captureException(error, {
        service: 'product-api',
        source: 'products.api.withErrorHandling',
        ...diagnostics,
      });

      const requestId = diagnostics.requestId ?? crypto.randomUUID();
      const status = resolveHttpStatus(error);

      if (error instanceof ApiErrorBuilder || error instanceof Error) {
        return createVersionedErrorResponse(error, status, requestId);
      } 

      const fallback = new Error('An unknown error occurred');
      return createVersionedErrorResponse(fallback, 500, requestId);
    }
  };
}
