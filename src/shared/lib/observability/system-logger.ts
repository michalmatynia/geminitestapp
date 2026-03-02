import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';

import { isSensitiveKey, REDACTED_VALUE, truncateString } from './log-redaction';

const MAX_CONTEXT_SIZE = 12000;
const MAX_VALUE_LENGTH = 4000;
const MAX_STACK_LENGTH = 20000;
const MAX_CAUSE_DEPTH = 5;

type CentralLogPayload = {
  level: SystemLogLevel;
  message: string;
  source?: string | null;
  category?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  fingerprint?: string | null;
  createdAt: string;
};

const getCentralLogWebhookUrl = (): string | null => process.env['CENTRAL_LOG_WEBHOOK_URL'] ?? null;

const forwardToCentralizedLogging = async (payload: CentralLogPayload): Promise<void> => {
  if (typeof window !== 'undefined') return;
  const webhookUrl = getCentralLogWebhookUrl();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Last‑chance fallback: avoid throwing from logger
    // eslint-disable-next-line no-console
    console.error('[system-logger] Failed to forward log to centralized sink', error);
  }
};

type CreateSystemLogFn = (input: {
  level: SystemLogLevel;
  message: string;
  category?: string | null;
  source?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | undefined;
  method?: string | undefined;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
}) => Promise<SystemLogRecord>;

type NotifyCriticalErrorFn = (record: SystemLogRecord, shouldNotify: boolean) => Promise<unknown>;

const loadCreateSystemLog = async (): Promise<CreateSystemLogFn | null> => {
  if (typeof window !== 'undefined') return null;
  const mod = (await import('./system-log-repository')) as { createSystemLog?: CreateSystemLogFn };
  return mod.createSystemLog ?? null;
};

const loadNotifyCriticalError = async (): Promise<NotifyCriticalErrorFn | null> => {
  if (typeof window !== 'undefined') return null;
  const mod = (await import('./critical-error-notifier')) as {
    notifyCriticalError?: NotifyCriticalErrorFn;
  };
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
        if (typeof val === 'string') return truncateString(val, MAX_VALUE_LENGTH);
        return val;
      },
      2
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

type ErrorCauseEntry = {
  message: string;
  name?: string;
  code?: string;
  stack?: string | null;
  raw?: Record<string, unknown> | null;
};

type NormalizedErrorInfo = {
  message: string;
  stack?: string | undefined | null;
  name?: string;
  code?: string;
  httpStatus?: number;
  expected?: boolean;
  critical?: boolean;
  retryable?: boolean;
  retryAfterMs?: number;
  meta?: Record<string, unknown> | null;
  causeChain?: ErrorCauseEntry[];
  raw?: Record<string, unknown> | null;
};

const readString = (value: unknown, maxLength: number = MAX_VALUE_LENGTH): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return truncateString(trimmed, maxLength);
};

const readBoolean = (value: unknown): boolean | undefined => {
  return typeof value === 'boolean' ? value : undefined;
};

const readNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = (value as { code?: unknown }).code;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return String(candidate);
  }
  return readString(candidate, 120);
};

const normalizeStack = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return truncateString(trimmed, MAX_STACK_LENGTH);
};

const readCause = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return undefined;
  return (value as { cause?: unknown }).cause;
};

const normalizeCauseEntry = (cause: unknown): ErrorCauseEntry => {
  if (cause instanceof Error) {
    const code = readCode(cause);
    const stack = normalizeStack(cause.stack);
    const normalizedName = readString(cause.name, 120);
    return {
      message: truncateString(cause.message || 'Unknown cause', MAX_VALUE_LENGTH),
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(code ? { code } : {}),
      ...(stack ? { stack } : {}),
    };
  }

  if (typeof cause === 'string') {
    return { message: truncateString(cause, MAX_VALUE_LENGTH) };
  }

  const message =
    (cause && typeof cause === 'object'
      ? readString((cause as Record<string, unknown>)['message'])
      : undefined) ?? 'Unknown cause';
  const name =
    cause && typeof cause === 'object'
      ? readString((cause as Record<string, unknown>)['name'], 120)
      : undefined;
  const code = readCode(cause);
  const stack =
    cause && typeof cause === 'object'
      ? normalizeStack((cause as Record<string, unknown>)['stack'])
      : undefined;
  const raw = sanitizeValue(cause);

  return {
    message,
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(stack ? { stack } : {}),
    ...(raw ? { raw } : {}),
  };
};

const buildCauseChain = (error: unknown): ErrorCauseEntry[] | undefined => {
  const chain: ErrorCauseEntry[] = [];
  const seen = new WeakSet<object>();
  let currentCause = readCause(error);

  while (currentCause !== undefined && currentCause !== null && chain.length < MAX_CAUSE_DEPTH) {
    if (typeof currentCause === 'object' && currentCause !== null) {
      if (seen.has(currentCause)) {
        chain.push({ message: 'Circular cause reference' });
        break;
      }
      seen.add(currentCause);
    }
    chain.push(normalizeCauseEntry(currentCause));
    currentCause = readCause(currentCause);
  }

  return chain.length > 0 ? chain : undefined;
};

export const normalizeErrorInfo = (error: unknown): NormalizedErrorInfo => {
  if (error instanceof Error) {
    const code = readCode(error);
    const httpStatus =
      readNumber((error as { httpStatus?: unknown }).httpStatus) ??
      readNumber((error as { status?: unknown }).status);
    const expected = readBoolean((error as { expected?: unknown }).expected);
    const critical = readBoolean((error as { critical?: unknown }).critical);
    const retryable = readBoolean((error as { retryable?: unknown }).retryable);
    const retryAfterMs = readNumber((error as { retryAfterMs?: unknown }).retryAfterMs);
    const meta = sanitizeValue((error as { meta?: unknown }).meta);
    const causeChain = buildCauseChain(error);
    const stack = normalizeStack(error.stack);
    const normalizedName = readString(error.name, 120);

    return {
      message: truncateString(error.message || 'Unknown error', MAX_VALUE_LENGTH),
      ...(stack ? { stack } : {}),
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(code ? { code } : {}),
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      ...(expected !== undefined ? { expected } : {}),
      ...(critical !== undefined ? { critical } : {}),
      ...(retryable !== undefined ? { retryable } : {}),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      ...(meta ? { meta } : {}),
      ...(causeChain ? { causeChain } : {}),
    };
  }

  if (typeof error === 'string') {
    return { message: truncateString(error, MAX_VALUE_LENGTH) };
  }

  const message =
    error && typeof error === 'object'
      ? readString((error as Record<string, unknown>)['message'])
      : undefined;
  const name =
    error && typeof error === 'object'
      ? readString((error as Record<string, unknown>)['name'], 120)
      : undefined;
  const code = readCode(error);
  const stack =
    error && typeof error === 'object'
      ? normalizeStack((error as Record<string, unknown>)['stack'])
      : undefined;
  const raw = sanitizeValue(error);
  const causeChain = buildCauseChain(error);

  return {
    message: message ?? 'Unknown error',
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(stack ? { stack } : {}),
    ...(causeChain ? { causeChain } : {}),
    ...(raw ? { raw } : {}),
  };
};

const extractRequestInfo = (
  request?: Request
): { path?: string; method?: string; requestId?: string } => {
  if (!request) return {};
  try {
    const url = new URL(request.url);
    return {
      path: url.pathname,
      method: request.method,
      ...(request.headers.get('x-request-id') && {
        requestId: request.headers.get('x-request-id')!,
      }),
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
    code?: string;
  } | null;
}): string => {
  let raw = '';
  raw += input.message ?? '';
  raw += String(input.source ?? '');
  raw += String(input.path ?? '');
  raw += String(input.statusCode ?? '');
  if (input.errorInfo) {
    raw += String(input.errorInfo.name ?? '');
    raw += String(input.errorInfo.code ?? '');
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
    const explicitCategory =
      typeof input.context?.['category'] === 'string' ? input.context['category'] : undefined;
    let category = explicitCategory;
    if (!category && input.error) {
      try {
        const { classifyError } = await import('@/shared/errors/error-classifier');
        category = classifyError(input.error);
      } catch {
        // Fallback if import fails
      }
    }

    const errorCode =
      (typeof input.context?.['errorCode'] === 'string' ? input.context['errorCode'] : undefined) ??
      errorInfo?.code;
    const errorName =
      (typeof input.context?.['errorName'] === 'string' ? input.context['errorName'] : undefined) ??
      errorInfo?.name;
    const service =
      typeof input.context?.['service'] === 'string' ? input.context['service'] : undefined;

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
      ...(errorCode ? { errorCode } : {}),
      ...(errorName ? { errorName } : {}),
      ...(service ? { service } : {}),
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

    // Fire-and-forget background task for server-side enrichment, forwarding, and DB persistence.
    // This keeps request handling latency low while using one canonical hydrated context.
    void (async () => {
      try {
        let hydratedContext = context;
        try {
          const { hydrateLogRuntimeContext } = await import(
            './runtime-context/hydrate-system-log-runtime-context'
          );
          hydratedContext = (await hydrateLogRuntimeContext(context)) ?? context;
        } catch (enrichmentError) {
          console.error(
            '[system-logger] Failed to attach registry runtime context',
            enrichmentError
          );
        }
        const forwardPromise = forwardToCentralizedLogging({
          level: input.level ?? 'info',
          message: input.message,
          source: input.source ?? null,
          category: category ?? null,
          context: hydratedContext,
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? requestInfo.path ?? null : null,
          method: requestInfo.method ?? null,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          userId: input.userId ?? null,
          fingerprint: fingerprint ?? null,
          createdAt: new Date().toISOString(),
        });
        const createSystemLog = await loadCreateSystemLog();
        if (!createSystemLog) {
          await forwardPromise;
          return;
        }
        const created: SystemLogRecord = await createSystemLog({
          level: input.level ?? 'info',
          message: input.message,
          category: category ?? null,
          source: input.source ?? null,
          context: sanitizeValue(hydratedContext),
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? requestInfo.path : undefined,
          method: requestInfo.method,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          userId: input.userId ?? null,
        });
        await forwardPromise;

        if (critical) {
          const notifyFn = await loadNotifyCriticalError();
          if (notifyFn) {
            await notifyFn(created, critical);
          }
        }
      } catch (err) {
        console.error('[system-logger] Failed to persist log asynchronously', err);
      }
    })();
  } catch (error) {
    console.error('[system-logger] Failed to process system log', error);
  }
}

export async function logSystemError(input: Omit<SystemLogInput, 'level'>): Promise<void> {
  await logSystemEvent({ ...input, level: 'error' });
}

export { ErrorSystem } from '../../utils/observability/error-system';
export { getSystemLogById, getSystemLogMetrics, listSystemLogs } from './system-log-repository';
