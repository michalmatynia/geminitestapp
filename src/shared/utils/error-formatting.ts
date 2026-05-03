import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
 
function unknownToErrorMessage(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Error) {
    return value.message.length > 0 ? value.message : value.name;
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  // Handle objects safely without "[object Object]"
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientCatch(error, {
        source: 'error-formatting',
        action: 'stringifyUnknownValue',
        level: 'warn',
      });
      // last-resort: try to extract a "message" property if present
      const maybeMessage = (value as { message?: unknown }).message;
      return typeof maybeMessage === 'string' ? maybeMessage : 'Non-serializable error object';
    }
  }

  return 'Unknown error';
}

export default unknownToErrorMessage;
