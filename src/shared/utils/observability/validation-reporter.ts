import type { ErrorContext } from '@/shared/types/observability';

import { reportClientError } from './client-error-reporter';

/**
 * Reports a validation error to the centralized logging system.
 * Handles both client and server environments.
 */
export async function reportValidationError(
  message: string,
  context: ErrorContext = {}
): Promise<void> {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    try {
      // eslint-disable-next-line import/no-restricted-paths
      const { logSystemEvent } = await import('@/features/observability/server');
      await logSystemEvent({
        level: 'warn',
        message,
        source: 'validation-reporter',
        context: {
          service: (context as Record<string, unknown>)['service'] || 'validation',
          ...context,
        },
      });
    } catch (error) {
      console.warn(`[ValidationReporter] ${message}`, { service: (context as Record<string, unknown>)['service'] || 'validation', ...context });
      console.error('[ValidationReporter] Failed to log to system logger:', error);
    }
  } else {
    try {
      await reportClientError(message, {
        category: 'VALIDATION',
        ...context
      });
    } catch (err) {
       
      console.error('[ValidationReporter] Failed to report client validation error:', err);
    }
  }
}