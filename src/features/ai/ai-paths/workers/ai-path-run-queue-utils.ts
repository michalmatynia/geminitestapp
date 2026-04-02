import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const QUEUE_TRANSPORT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
]);
const QUEUE_TRANSPORT_ERROR_MESSAGE_PARTS = [
  'econnrefused',
  'econnreset',
  'timeout',
  'socket',
  'connection is closed',
  'read only',
  'not connected',
] as const;

const readQueueTransportErrorCode = (error: Error): string | null => {
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === 'string' ? code.toUpperCase() : null;
};

export const isQueueTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const code = readQueueTransportErrorCode(error);
  if (code && QUEUE_TRANSPORT_ERROR_CODES.has(code)) return true;

  const message = error.message.toLowerCase();
  return QUEUE_TRANSPORT_ERROR_MESSAGE_PARTS.some((part) => message.includes(part));
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
