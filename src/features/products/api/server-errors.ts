import 'server-only';

import { NextRequest } from 'next/server';

import { AppError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { ApiErrorBuilder, ErrorStatusCodes, createVersionedErrorResponse } from './errors';

const extractRequestDiagnostics = <T extends unknown[]>(
  args: T
): {
  requestId?: string | undefined;
  method?: string | undefined;
  route?: string | undefined;
  queryKeys?: string[] | undefined;
} => {
  const request = args[0];
  if (!(request instanceof NextRequest)) return {};
  try {
    const url = new URL(request.url);
    const queryKeys = Array.from(url.searchParams.keys()).slice(0, 20);
    return {
      requestId: request.headers.get('x-request-id') ?? undefined,
      method: request.method,
      route: url.pathname,
      ...(queryKeys.length > 0 ? { queryKeys } : {}),
    };
  } catch {
    return {
      requestId: request.headers.get('x-request-id') ?? undefined,
      method: request.method,
    };
  }
};

const resolveHttpStatus = (error: unknown): number => {
  if (error instanceof ApiErrorBuilder) {
    const code = error.build().error.code;
    return ErrorStatusCodes[code] ?? 500;
  }
  if (error instanceof AppError) {
    return error.httpStatus;
  }
  return 500;
};

// Middleware for consistent error handling
export function withErrorHandling<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      const requestDiagnostics = extractRequestDiagnostics(args);
      // Centralized error logging
      await ErrorSystem.captureException(error, {
        service: 'product-api',
        source: 'products.api.withErrorHandling',
        ...requestDiagnostics,
      });

      // Generate request ID for tracking
      const requestId = requestDiagnostics.requestId ?? crypto.randomUUID();
      const status = resolveHttpStatus(error);

      // Ensure error is an instance of Error or ApiErrorBuilder for createVersionedErrorResponse
      if (error instanceof ApiErrorBuilder) {
        return createVersionedErrorResponse(error, status, requestId);
      } else if (error instanceof Error) {
        return createVersionedErrorResponse(error, status, requestId);
      } else {
        // Fallback for unexpected error types
        const genericError = new Error('An unknown error occurred');
        return createVersionedErrorResponse(genericError, 500, requestId);
      }
    }
  };
}
