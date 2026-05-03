import type { ErrorContext } from '@/shared/contracts/observability';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


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
      ...context,
      service: context.service ?? 'validation',
    } satisfies Record<string, unknown>);
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
    logClientCatch(err, {
      source: 'validation-reporter',
      action: 'sendClientValidationReport',
      service: context.service ?? 'validation',
    });
    const { logger } = await import('@/shared/utils/logger');
    logger.error(
      '[ValidationReporter] Failed to report client validation error',
      err instanceof Error ? err : new Error(String(err))
    );
  }
}
