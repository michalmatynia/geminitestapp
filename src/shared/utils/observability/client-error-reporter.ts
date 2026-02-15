'use client';

import type { ErrorContext } from '@/shared/types/observability';

export const reportClientError = async (error: unknown, context: ErrorContext = {}): Promise<void> => {
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
    logger.error('Failed to send client error report', err);
  }
};
