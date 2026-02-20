import type { ErrorContext } from '@/shared/contracts/observability';

/**
 * Reports a validation error to the centralized logging system.
 * Stays client-safe to avoid pulling server-only observability modules
 * into client bundles.
 */
export async function reportValidationError(
  message: string,
  context: ErrorContext = {}
): Promise<void> {
  if (typeof window === 'undefined') {
    const { logger } = await import('@/shared/utils/logger');
    logger.warn(`[ValidationReporter] ${message}`, {
      service: (context as Record<string, unknown>)['service'] || 'validation',
      ...context,
    });
    return;
  }

  try {
    const errorPayload = {
      message,
      name: 'ValidationError',
      context,
    };

    await fetch('/api/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorPayload),
      keepalive: true,
    });
  } catch (err) {
    const { logger } = await import('@/shared/utils/logger');
    logger.error('[ValidationReporter] Failed to report client validation error', err);
  }
}
