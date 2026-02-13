/**
 * Mutation Error Handler Utilities
 *
 * Standardized error handling patterns for TanStack Query mutations.
 * These utilities reduce boilerplate across query hook files by providing
 * reusable error extraction and wrapping functions.
 */

import { ApiError } from '@/shared/lib/api-client';

/**
 * API Payload Result Type
 * Represents the result wrapper used by API payload mutations
 */
export type ApiPayloadResult<T> = {
  ok: boolean;
  payload?: T | unknown;
  error?: string;
};

/**
 * Resolves error message from API payload result
 * Tries multiple fields (error, message) and falls back to provided message
 *
 * @param payload - The API response payload
 * @param fallback - Fallback message if no error found
 * @returns Extracted or fallback error message
 */
export const resolvePayloadErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;

  const record = payload as Record<string, unknown>;

  if (typeof record['error'] === 'string' && record['error'].trim()) {
    return record['error'];
  }

  if (typeof record['message'] === 'string' && record['message'].trim()) {
    return record['message'];
  }

  return fallback;
};

/**
 * Unwraps API payload result, throwing ApiError on failure
 * Used in mutation functions to extract payload or throw standardized error
 *
 * @param result - The API payload result
 * @param fallbackMessage - Fallback error message
 * @returns The unwrapped payload
 * @throws ApiError if result.ok is false
 */
export const unwrapMutationResult = <TPayload>(
  result: ApiPayloadResult<TPayload>,
  fallbackMessage: string
): TPayload => {
  if (!result.ok) {
    const message = resolvePayloadErrorMessage(result.payload, fallbackMessage);
    throw new ApiError(message, 400);
  }
  return result.payload as TPayload;
};

/**
 * Handles mutation error and extracts error message
 * Used in onError handlers to provide consistent error messaging
 *
 * @param error - The error thrown by mutation
 * @param fallback - Fallback message if error cannot be extracted
 * @returns Extracted error message
 */
export const extractMutationErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
};

/**
 * Creates a standard error handler for mutations that need custom onError
 * Useful for mutations that need to perform additional error handling
 *
 * @param onCustomError - Custom error handler to call after message extraction
 * @returns Error handler function for useMutation onError
 */
export const createMutationErrorHandler =
  (onCustomError?: (message: string, error: unknown) => void) =>
    (error: unknown): void => {
      const message = extractMutationErrorMessage(error, 'An error occurred');
      onCustomError?.(message, error);
    };
