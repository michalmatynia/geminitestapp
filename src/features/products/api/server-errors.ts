import "server-only";

import { ErrorSystem } from "@/features/observability/server";
import { ApiErrorBuilder, createVersionedErrorResponse } from "./errors";

// Middleware for consistent error handling
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      // Centralized error logging
      await ErrorSystem.captureException(error, {
        service: "product-api",
      });
      
      // Generate request ID for tracking
      const requestId = crypto.randomUUID();
      
      // Ensure error is an instance of Error or ApiErrorBuilder for createVersionedErrorResponse
      if (error instanceof ApiErrorBuilder) {
        return createVersionedErrorResponse(error, 500, requestId);
      } else if (error instanceof Error) {
        return createVersionedErrorResponse(error, 500, requestId);
      } else {
        // Fallback for unexpected error types
        const genericError = new Error("An unknown error occurred");
        return createVersionedErrorResponse(genericError, 500, requestId);
      }
    }
  };
}
