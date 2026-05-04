/**
 * Internal Observability Fallback
 * 
 * Fallback error reporting for internal observability failures.
 * Provides:
 * - Internal error context management
 * - Fallback payload serialization
 * - Client error dispatch integration
 * - Observability system error handling
 * - Error reporting resilience
 */

import { dispatchClientCatch, type ClientErrorContext } from './client-error-dispatch';

export type InternalObservabilityErrorContext = ClientErrorContext & {
  source: string;
  action: string;
};

const serializeFallbackPayload = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const writeServerFallback = (prefix: string, value: unknown): void => {
  try {
    // eslint-disable-next-line no-console
    console.error(prefix, value);
  } catch {
    try {
      // eslint-disable-next-line no-console
      console.error(`${prefix} ${serializeFallbackPayload(value)}`);
    } catch {
      // No-op fallback.
    }
  }
};

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
