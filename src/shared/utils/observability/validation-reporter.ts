import type { ErrorContext } from '@/shared/types/observability';

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
    console.warn(`[ValidationReporter] ${message}`, {
      service: (context as Record<string, unknown>)['service'] || 'validation',
      ...context,
    });
    return;
  }

  try {
    const errorPayload = {
      message,
      name: 'ValidationError',
      ...context,
    };

    await fetch('/api/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: errorPayload, context }),
      keepalive: true,
    });
  } catch (err) {
    console.error('[ValidationReporter] Failed to report client validation error:', err);
  }
}
