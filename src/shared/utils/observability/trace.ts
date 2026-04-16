/**
 * Simple client-side tracing utility to correlate client requests with server logs.
 */

let currentTraceId: string | null = null;

/**
 * Generates a random trace ID.
 */
export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Gets the current trace ID or generates a new one if it doesn't exist.
 * The trace ID is stable for the duration of the page session.
 */
export function getTraceId(): string {
  currentTraceId ??= generateTraceId();
  return currentTraceId;
}

/**
 * Resets the current trace ID. Use this when a user session changes.
 */
export function resetTraceId(): void {
  currentTraceId = generateTraceId();
}
