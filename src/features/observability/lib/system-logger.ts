import type { SystemLogLevel, SystemLogRecord } from '@/shared/types/domain/system-logs';

import {
  isSensitiveKey,
  REDACTED_VALUE,
  truncateString,
} from './log-redaction';

const MAX_CONTEXT_SIZE = 12000;
const MAX_VALUE_LENGTH = 4000;

type CreateSystemLogFn = (typeof import('./system-log-repository'))['createSystemLog'];
type NotifyCriticalErrorFn = (typeof import('./critical-error-notifier'))['notifyCriticalError'];

const dynamicImport = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<unknown>;

const loadCreateSystemLog = async (): Promise<CreateSystemLogFn | null> => {
  if (typeof window !== 'undefined') return null;
  const mod = await dynamicImport('./system-log-repository') as { createSystemLog?: CreateSystemLogFn };
  return mod.createSystemLog ?? null;
};

const loadNotifyCriticalError = async (): Promise<NotifyCriticalErrorFn | null> => {
  if (typeof window !== 'undefined') return null;
  const mod = await dynamicImport('./critical-error-notifier') as { notifyCriticalError?: NotifyCriticalErrorFn };
  return mod.notifyCriticalError ?? null;
};

const hash16 = (input: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (BigInt(h2 >>> 0) << 32n) | BigInt(h1 >>> 0);
  return combined.toString(16).padStart(16, '0').slice(0, 16);
};

const sanitizeValue = (value: unknown): Record<string, unknown> | null => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(
      value,
      (_key: string, val: unknown): unknown => {
        if (_key && isSensitiveKey(_key)) return REDACTED_VALUE;
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'bigint') return val.toString();
        if (typeof val === 'string')
          return truncateString(val, MAX_VALUE_LENGTH);
        return val;
      },
      2,
    );
    if (!json) return null;
    if (json.length > MAX_CONTEXT_SIZE) {
      return {
        truncated: true,
        preview: json.slice(0, MAX_CONTEXT_SIZE),
      };
    }
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { error: 'Failed to serialize context.' };
  }
};

export const normalizeErrorInfo = (
  error: unknown,
): {
  message: string;
  stack?: string | undefined | null;
  name?: string;
  raw?: Record<string, unknown> | null;
} => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { message: 'Unknown error', raw: sanitizeValue(error) };
};

const extractRequestInfo = (
  request?: Request,
): { path?: string; method?: string; requestId?: string } => {
  if (!request) return {};
  try {
    const url = new URL(request.url);
    return {
      path: url.pathname,
      method: request.method,
      ...(request.headers.get('x-request-id') && { requestId: request.headers.get('x-request-id')! }),
    };
  } catch {
    return {};
  }
};

export const buildErrorFingerprint = (input: {
  message: string;
  source?: string | null;
  path?: string | null;
  statusCode?: number | null;
  errorInfo?: {
    message?: string;
    stack?: string | undefined | null;
    name?: string;
  } | null;
}): string => {
  let raw = '';
  raw += input.message ?? '';
  raw += String(input.source ?? '');
  raw += String(input.path ?? '');
  raw += String(input.statusCode ?? '');
  if (input.errorInfo) {
    raw += String(input.errorInfo.name ?? '');
    raw += String(input.errorInfo.message ?? '');
    const stack = input.errorInfo.stack ?? '';
    const normalizedStack = stack
      .split('\n')
      .slice(0, 6)
      .map((line: string) => line.replace(/\s+at\s+/g, ' at ').trim())
      .join('\n');
    raw += normalizedStack;
  }
  return hash16(raw);
};

export const getErrorFingerprint = (input: {
  message: string;
  source?: string | null;
  request?: Request;
  statusCode?: number | null;
  error?: unknown;
}): string => {
  const requestInfo = extractRequestInfo(input.request);
  const errorInfo = input.error ? normalizeErrorInfo(input.error) : null;
  return buildErrorFingerprint({
    message: input.message,
    source: input.source ?? null,
    path: requestInfo.path ?? null,
    statusCode: input.statusCode ?? null,
    errorInfo,
  });
};

export type SystemLogInput = {
  level?: SystemLogLevel;
  message: string;
  source?: string;
  context?: Record<string, unknown> | null;
  error?: unknown;
  request?: Request;
  statusCode?: number | undefined;
  userId?: string | null;
  requestId?: string | null;
  critical?: boolean;
};

export async function logSystemEvent(input: SystemLogInput): Promise<void> {
  try {
    const errorInfo = input.error ? normalizeErrorInfo(input.error) : null;
    const requestInfo = extractRequestInfo(input.request);

    // Auto-classify error if it exists and category is missing
    let category = input.context?.['category'];
    if (!category && input.error) {
      try {
        const { classifyError } = await import('../utils/error-classifier');
        category = classifyError(input.error);
      } catch {
        // Fallback if import fails
      }
    }

    const fingerprint =
      input.level === 'error' || input.level === 'warn' || errorInfo
        ? buildErrorFingerprint({
          message: input.message,
          source: input.source ?? null,
          path: input.request?.url ? (requestInfo.path ?? null) : null,
          statusCode: input.statusCode ?? null,
          errorInfo,
        })
        : null;
    const context = {
      ...(input.context ?? {}),
      ...(category ? { category } : {}),
      ...(errorInfo ? { error: errorInfo } : {}),
      ...(fingerprint ? { fingerprint } : {}),
    };

    const critical =
      typeof input.critical === 'boolean'
        ? input.critical
        : typeof input.context?.['critical'] === 'boolean'
          ? Boolean(input.context?.['critical'])
          : false;

    // Emit to console for standard logging and capture tools
    const consoleMsg = `[${input.source || 'system'}] ${input.message}`;
    if (input.level === 'error' || critical) {
      console.error(consoleMsg, context);
    } else if (input.level === 'warn') {
      console.warn(consoleMsg, context);
    } else {
      console.log(consoleMsg, context);
    }

    if (typeof window !== 'undefined') {
      return;
    }

    const createSystemLog = await loadCreateSystemLog();
    if (!createSystemLog) {
      return;
    }
    const created: SystemLogRecord = await createSystemLog({
      level: input.level ?? 'info',
      message: input.message,
      source: input.source ?? null,
      context: sanitizeValue(context),
      stack: errorInfo?.stack ?? null,
      path: input.request?.url ? requestInfo.path : undefined,
      method: requestInfo.method,
      statusCode: input.statusCode ?? null,
      requestId: input.requestId ?? requestInfo.requestId ?? null,
      userId: input.userId ?? null,
    });

    if (critical) {
      const notifyCriticalError = await loadNotifyCriticalError();
      if (notifyCriticalError) {
        await notifyCriticalError(created, critical);
      }
    }
  } catch (error) {
    console.error('[system-logger] Failed to write system log', error);
  }
}

export async function logSystemError(
  input: Omit<SystemLogInput, 'level'>,
): Promise<void> {
  await logSystemEvent({ ...input, level: 'error' });
}
