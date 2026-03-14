import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type SystemLogInput = {
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

  if (level === 'error' || input.critical) {
    console.error(consoleMessage, context);
  } else if (level === 'warn') {
    console.warn(consoleMessage, context);
  } else {
    console.log(consoleMessage, context);
  }

  if (input.error || level === 'error' || input.critical) {
    const err = input.error instanceof Error ? input.error : new Error(input.message);
    logClientError(err, {
      context: {
        ...(context ?? {}),
        source,
        service: input.service,
        statusCode: input.statusCode,
      },
    });
  }
}

export async function logSystemError(input: Omit<SystemLogInput, 'level'>): Promise<void> {
  await logSystemEvent({ ...input, level: 'error' });
}
