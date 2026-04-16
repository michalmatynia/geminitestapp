import type { ErrorContext } from '@/shared/contracts/observability';
import { isAbortLikeError } from '@/shared/utils/observability/is-abort-like-error';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const extractErrorInfo = (error: unknown): { message: string; stack: string | undefined; name: string } => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return {
    message: String(error),
    stack: undefined,
    name: 'ClientError',
  };
};

export const reportClientError = async (
  error: unknown,
  context: ErrorContext = {}
): Promise<void> => {
  if (isAbortLikeError(error)) return;

  try {
    const errorInfo = extractErrorInfo(error);
    const errorPayload = {
      ...errorInfo,
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
    logClientCatch(err, {
      source: 'client-error-reporter',
      action: 'sendClientErrorReport',
      service: context.service !== undefined && context.service.length > 0 ? context.service : 'observability.client-error-reporter',
    });
    const { logger } = await import('@/shared/utils/logger');
    logger.error(
      'Failed to send client error report',
      err instanceof Error ? err : new Error(String(err)),
      { service: 'observability.client-error-reporter' }
    );
  }
};
