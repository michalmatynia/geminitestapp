/**
 * System Logger Client
 * 
 * Client-side system logging utilities.
 * Provides:
 * - Client-side log level management
 * - Logging control integration
 * - Log level filtering
 * - Error logging coordination
 * - Client-side observability logging
 */

import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import {
  getObservabilityLoggingControlTypeForSystemLogLevel,
} from '@/shared/lib/observability/logging-controls';
import { isClientLoggingControlEnabled } from '@/shared/lib/observability/logging-controls-client';
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

const writeClientConsoleLog = (
  level: SystemLogLevel,
  message: string,
  error: unknown,
  context: Record<string, unknown>
): void => {
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(message, error, context);
    return;
  }
  if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(message, context);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(message, context);
};

const hasErrorValue = (error: unknown): boolean => error !== undefined && error !== null;

const shouldReportClientError = (input: SystemLogInput, level: SystemLogLevel): boolean =>
  hasErrorValue(input.error) || level === 'error' || input.critical === true;

const resolveClientLogSource = (source: string | undefined): string => {
  const normalizedSource = source?.trim();
  return normalizedSource !== undefined && normalizedSource.length > 0 ? normalizedSource : 'system';
};

const buildClientLogContext = (
  input: SystemLogInput,
  source: string
): Record<string, unknown> => ({
  ...(input.context ?? {}),
  source,
  service: input.service,
  statusCode: input.statusCode,
});

export function logSystemEvent(input: SystemLogInput): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const level = input.level ?? 'info';
  const loggingControlType = getObservabilityLoggingControlTypeForSystemLogLevel(
    level,
    Boolean(input.critical)
  );
  if (!isClientLoggingControlEnabled(loggingControlType)) {
    return Promise.resolve();
  }
  const source = resolveClientLogSource(input.source);
  const consoleMessage = `[${source}] ${input.message}`;
  const logContext = buildClientLogContext(input, source);

  writeClientConsoleLog(input.critical === true ? 'error' : level, consoleMessage, input.error, logContext);

  if (shouldReportClientError(input, level)) {
    const err = input.error instanceof Error ? input.error : new Error(input.message);
    logClientError(err, {
      context: logContext,
    });
  }
  return Promise.resolve();
}

export const logSystemError = (input: Omit<SystemLogInput, 'level'>): Promise<void> =>
  logSystemEvent({ ...input, level: 'error' });
