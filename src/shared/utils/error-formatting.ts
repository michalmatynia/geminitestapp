import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

/**
 * Converts unknown error values to user-friendly error messages.
 * 
 * Handles:
 * - Error instances → Extract message or name
 * - Strings → Return as-is
 * - Primitives → Convert to string
 * - Objects → Stringify or extract message property
 * - Null/undefined → Return null
 * 
 * @param value - Unknown error value to format
 * @returns Formatted error message or null
 */
function unknownToErrorMessage(value: unknown): string | null {
  // Null or undefined - No error message
  if (value === null || value === undefined) return null;

  // Error instances - Use message or fallback to name
  if (value instanceof Error) {
    return value.message.length > 0 ? value.message : value.name;
  }

  // String values - Return directly
  if (typeof value === 'string') return value;
  
  // Primitive values - Convert to string
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  // Objects - Attempt to stringify or extract message
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientCatch(error, {
        source: 'error-formatting',
        action: 'stringifyUnknownValue',
        level: 'warn',
      });
      // Fallback: Extract message property if available
      const maybeMessage = (value as { message?: unknown }).message;
      return typeof maybeMessage === 'string' ? maybeMessage : 'Non-serializable error object';
    }
  }

  // Unknown type - Generic fallback
  return 'Unknown error';
}

export default unknownToErrorMessage;
