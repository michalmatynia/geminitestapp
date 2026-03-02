import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export const isQueueTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  if (typeof code === 'string') {
    const normalized = code.toUpperCase();
    if (
      normalized === 'ECONNREFUSED' ||
      normalized === 'ECONNRESET' ||
      normalized === 'ETIMEDOUT' ||
      normalized === 'EPIPE'
    ) {
      return true;
    }
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('timeout') ||
    message.includes('socket') ||
    message.includes('connection is closed') ||
    message.includes('read only') ||
    message.includes('not connected')
  );
};

export const createDebugQueueLogger = (logSource: string, enabled: boolean) => {
  const log = (message: string, context?: Record<string, unknown>): void => {
    if (!enabled) return;
    void logSystemEvent({
      level: 'info',
      source: logSource,
      message,
      context: context ?? null,
    });
  };

  const warn = (message: string, context?: Record<string, unknown>): void => {
    if (!enabled) return;
    void logSystemEvent({
      level: 'warn',
      source: logSource,
      message,
      context: context ?? null,
    });
  };

  return { log, warn };
};

export const parseEnvNumber = (name: string, fallback: number, min: number = 0): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};
