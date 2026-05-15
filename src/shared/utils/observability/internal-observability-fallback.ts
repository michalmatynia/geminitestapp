/**
 * Internal Observability Fallback Utility
 * 
 * A critical safety net for reporting errors that occur within the observability 
 * and logging system itself. This module prevents recursion and ensures that
 * failures in reporting tools (e.g., logger or telemetry failure) are still 
 * captured in system logs or client dispatch.
 * 
 * Features:
 * - Resilience: Provides a fallback mechanism for observability system errors.
 * - Server-side logging: Gracefully serializes errors to the console on the server.
 * - Client-side dispatch: Integrates with the client error reporter for 
 *   frontend-specific observability failures.
 * 
 * Usage:
 * This utility should ONLY be used internally by observability modules (e.g., 
 * the main Logger or Telemetry systems) when they fail to log their primary errors.
 */

import { dispatchClientCatch, type ClientErrorContext } from './client-error-dispatch';

/**
 * Contextual information for an internal observability error.
 */
export type InternalObservabilityErrorContext = ClientErrorContext & {
  source: string; // The subsystem reporting the failure (e.g., 'Logger')
  action: string; // The operation that failed (e.g., 'writeBatch')
};

/**
 * Serializes a value for fallback logging, ensuring it doesn't crash 
 * if JSON serialization fails.
 * 
 * @param value - The data to serialize
 * @returns Serialized string
 */
const serializeFallbackPayload = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Fallback server-side error logger. Uses native console.error 
 * to ensure visibility even when standard logging infrastructure is down.
 * 
 * @param prefix - Prefix string describing the failure
 * @param value - Data payload associated with the failure
 */
const writeServerFallback = (prefix: string, value: unknown): void => {
  try {
    // eslint-disable-next-line no-console
    console.error(`${prefix} ${serializeFallbackPayload(value)}`);
  } catch {
    // No-op fallback if logging fails entirely.
  }
};

/**
 * Reports an error originating from within the platform's observability system.
 * Routes to the appropriate client-side or server-side fallback depending 
 * on the runtime environment.
 * 
 * @param error - The error object to report
 * @param context - Context about which observability feature failed
 */
export const reportObservabilityInternalError = (
  error: unknown,
  context: InternalObservabilityErrorContext
): void => {
  if (typeof window !== 'undefined') {
    dispatchClientCatch(error, context);
    return;
  }

  const prefix = `[${context.source}] ${context.action} failed`;
  writeServerFallback(prefix, { error, context });
};
