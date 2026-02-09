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
     
    console.warn(`[ValidationReporter] ${message}`, { service: (context as Record<string, unknown>)['service'] || 'validation', ...context });
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