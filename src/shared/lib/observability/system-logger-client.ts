import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import { logger } from '@/shared/utils/logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type SystemLogInput = {
  level?: SystemLogLevel;
  message: string;
  source?: string;
  service?: string;
  context?: Record<string, unknown> | null;
  error?: unknown;
  statusCode?: number | undefined;
  critical?: boolean;
};

export async function logSystemEvent(input: SystemLogInput): Promise<void> {
  if (typeof window === 'undefined') return;

  const level = input.level ?? 'info';
  const source = input.source || 'system';
  const context = input.context ?? undefined;
  const consoleMessage = `[${source}] ${input.message}`;
  const logContext = {
    ...(context ?? {}),
    source,
    service: input.service,
    statusCode: input.statusCode,
  };

  if (level === 'error' || input.critical) {
    logger.error(consoleMessage, input.error, {
      ...logContext,
      service: input.service,
    });
  } else if (level === 'warn') {
    logger.warn(consoleMessage, {
      ...logContext,
      service: input.service,
    });
  } else {
    logger.info(consoleMessage, {
      ...logContext,
      service: input.service,
    });
  }

  if (input.error || level === 'error' || input.critical) {
    const err = input.error instanceof Error ? input.error : new Error(input.message);
    logClientError(err, {
      context: {
        ...(logContext ?? {}),
      },
    });
  }
}

export async function logSystemError(input: Omit<SystemLogInput, 'level'>): Promise<void> {
  await logSystemEvent({ ...input, level: 'error' });
}
