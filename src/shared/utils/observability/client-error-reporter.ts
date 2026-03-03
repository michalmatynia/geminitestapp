'use client';

import type { ErrorContext } from '@/shared/contracts/observability';
import { isAbortLikeError } from '@/shared/utils/observability/is-abort-like-error';

export const reportClientError = async (
  error: unknown,
  context: ErrorContext = {}
): Promise<void> => {
  if (isAbortLikeError(error)) return;

  try {
    const errorPayload = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'ClientError',
      context,
    };

    await fetch('/api/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorPayload),
      // Optional: Add keepalive to ensure request is sent even if page unloads
      keepalive: true,
    });
  } catch (err) {
    const { logger } = await import('@/shared/utils/logger');
    logger.error(
      'Failed to send client error report',
      err instanceof Error ? err : new Error(String(err)),
      { service: 'observability.client-error-reporter' }
    );
  }
};
