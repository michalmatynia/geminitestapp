import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';

import {
  isSensitiveKey,
  REDACTED_VALUE,
  redactSensitiveText,
  truncateString,
} from './log-redaction';
import {
  getObservabilityLoggingControlTypeForSystemLogLevel,
} from './logging-controls';
import { isServerLoggingEnabled } from './logging-controls-server';
import { getActiveOtelContextAttributes } from './otel-context';
import { emitOtelLogRecord } from './otel-log-bridge';
import { forwardToCentralizedLogging } from './system-logger-central-forwarding';


const MAX_CONTEXT_SIZE = 12000;
const MAX_VALUE_LENGTH = 4000;
const MAX_STACK_LENGTH = 20000;
const MAX_CAUSE_DEPTH = 5;

const parseEnvBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
};

const shouldPersistSystemLogsToDatabase = (env: NodeJS.ProcessEnv = process.env): boolean => {
  const explicit = parseEnvBoolean(env['ENABLE_DEV_SYSTEM_LOG_PERSISTENCE']);
  if (explicit !== null) {
    return explicit;
  }

  return env['NODE_ENV'] !== 'development';
};

const isProductionBuildPhase = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env['NEXT_PHASE'] === 'phase-production-build';

type CreateSystemLogFn = (input: {
  level: SystemLogLevel;
  message: string;
  category?: string | null;
  source?: string | null;
  service?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | undefined;
  method?: string | undefined;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  userId?: string | null;
}) => Promise<SystemLogRecord>;

type NotifyCriticalErrorFn = (record: SystemLogRecord, shouldNotify: boolean) => Promise<unknown>;

const logSystemLoggerFailure = (message: string, error: unknown): void => {
  console.error(message, error);
};

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
        if (typeof val === 'string') {
          return truncateString(redactSensitiveText(val), MAX_VALUE_LENGTH);
        }
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
  } catch (error) {
    logSystemLoggerFailure('[system-logger] Failed to serialize context', error);
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
): {
  path?: string;
  method?: string;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
} => {
  if (!request) return {};
  try {
    const url = new URL(request.url);
    const headerRequestId = request.headers.get('x-request-id')?.trim() || null;
    const headerTraceId = request.headers.get('x-trace-id')?.trim() || null;
    const headerCorrelationId = request.headers.get('x-correlation-id')?.trim() || null;
    return {
      path: url.pathname,
      method: request.method,
      ...(headerRequestId ? { requestId: headerRequestId } : {}),
      ...(headerTraceId ? { traceId: headerTraceId } : {}),
      ...(headerCorrelationId ? { correlationId: headerCorrelationId } : {}),
    };
  } catch (error) {
    logSystemLoggerFailure('[system-logger] Failed to extract request info', error);
    return {};
  }
};

const resolveServiceFromSource = (source: string | undefined): string | null => {
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed) return null;
  const segments = trimmed.split('.').filter(Boolean);
  const maybeMethod = segments[segments.length - 1];
  const isMethod =
    maybeMethod === 'GET' ||
    maybeMethod === 'POST' ||
    maybeMethod === 'PUT' ||
    maybeMethod === 'PATCH' ||
    maybeMethod === 'DELETE' ||
    maybeMethod === 'HEAD' ||
    maybeMethod === 'OPTIONS';
  const base = isMethod ? segments.slice(0, -1) : segments;
  if (base.length >= 2) return `${base[0]}.${base[1]}`;
  if (base.length === 1) return base[0] ?? null;
  return null;
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
  service?: string;
  context?: Record<string, unknown> | null;
  error?: unknown;
  request?: Request;
  statusCode?: number | undefined;
  userId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  critical?: boolean;
};

export async function logSystemEvent(input: SystemLogInput): Promise<void> {
  try {
    const level = input.level ?? 'info';
    const loggingControlType = getObservabilityLoggingControlTypeForSystemLogLevel(
      level,
      Boolean(input.critical)
    );
    if (!(await isServerLoggingEnabled(loggingControlType))) {
      return;
    }

    const errorInfo = input.error ? normalizeErrorInfo(input.error) : null;
    const requestInfo = extractRequestInfo(input.request);
    const activeOtelContext = getActiveOtelContextAttributes();

    // Auto-classify error if it exists and category is missing
    const explicitCategory =
      typeof input.context?.['category'] === 'string' ? input.context['category'] : undefined;
    let category = explicitCategory;
    if (!category && input.error) {
      try {
        const { classifyError } = await import('@/shared/errors/error-classifier');
        category = classifyError(input.error);
      } catch (error) {
        logSystemLoggerFailure('[system-logger] Failed to classify error', error);
      }
    }

    const errorCode =
      (typeof input.context?.['errorCode'] === 'string' ? input.context['errorCode'] : undefined) ??
      errorInfo?.code;
    const errorName =
      (typeof input.context?.['errorName'] === 'string' ? input.context['errorName'] : undefined) ??
      errorInfo?.name;
    const service =
      (typeof input.service === 'string' && input.service.trim().length > 0
        ? input.service.trim()
        : null) ??
      (typeof input.context?.['service'] === 'string' && input.context['service'].trim().length > 0
        ? input.context['service'].trim()
        : null) ??
      resolveServiceFromSource(input.source) ??
      undefined;
    const traceId =
      (typeof input.traceId === 'string' && input.traceId.trim().length > 0
        ? input.traceId.trim()
        : null) ??
      requestInfo.traceId ??
      (typeof input.context?.['traceId'] === 'string' && input.context['traceId'].trim().length > 0
        ? input.context['traceId'].trim()
        : null) ??
      null;
    const correlationId =
      (typeof input.correlationId === 'string' && input.correlationId.trim().length > 0
        ? input.correlationId.trim()
        : null) ??
      requestInfo.correlationId ??
      (typeof input.context?.['correlationId'] === 'string' &&
      input.context['correlationId'].trim().length > 0
        ? input.context['correlationId'].trim()
        : null) ??
      null;
    const spanId =
      (typeof input.spanId === 'string' && input.spanId.trim().length > 0
        ? input.spanId.trim()
        : null) ??
      (typeof input.context?.['spanId'] === 'string' && input.context['spanId'].trim().length > 0
        ? input.context['spanId'].trim()
        : null) ??
      null;
    const parentSpanId =
      (typeof input.parentSpanId === 'string' && input.parentSpanId.trim().length > 0
        ? input.parentSpanId.trim()
        : null) ??
      (typeof input.context?.['parentSpanId'] === 'string' &&
      input.context['parentSpanId'].trim().length > 0
        ? input.context['parentSpanId'].trim()
        : null) ??
      null;
    const otelTraceId =
      (typeof input.context?.['otelTraceId'] === 'string' &&
      input.context['otelTraceId'].trim().length > 0
        ? input.context['otelTraceId'].trim()
        : null) ??
      activeOtelContext.otelTraceId ??
      null;
    const otelSpanId =
      (typeof input.context?.['otelSpanId'] === 'string' &&
      input.context['otelSpanId'].trim().length > 0
        ? input.context['otelSpanId'].trim()
        : null) ??
      activeOtelContext.otelSpanId ??
      null;
    const otelTraceFlags =
      (typeof input.context?.['otelTraceFlags'] === 'string' &&
      input.context['otelTraceFlags'].trim().length > 0
        ? input.context['otelTraceFlags'].trim()
        : null) ??
      activeOtelContext.otelTraceFlags ??
      null;

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
      ...(traceId ? { traceId } : {}),
      ...(correlationId ? { correlationId } : {}),
      ...(spanId ? { spanId } : {}),
      ...(parentSpanId ? { parentSpanId } : {}),
      ...(otelTraceId ? { otelTraceId } : {}),
      ...(otelSpanId ? { otelSpanId } : {}),
      ...(otelTraceFlags ? { otelTraceFlags } : {}),
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

    if (typeof window !== 'undefined' || isProductionBuildPhase()) {
      return;
    }

    // Fire-and-forget background task for server-side enrichment, forwarding, and DB persistence.
    // This keeps request handling latency low while using one canonical hydrated context.
    void (async () => {
      try {
        let hydratedContext = context;
        try {
          const { hydrateLogContext } = await import('./log-hydration-registry');
          hydratedContext = (await hydrateLogContext(context as Record<string, unknown>)) ?? context;
        } catch (enrichmentError) {
          logSystemLoggerFailure(
            '[system-logger] Failed to attach registry runtime context',
            enrichmentError
          );
        }

        emitOtelLogRecord({
          level: input.level ?? 'info',
          message: input.message,
          source: input.source ?? null,
          service: service ?? null,
          category: category ?? null,
          context: hydratedContext,
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? (requestInfo.path ?? null) : null,
          method: requestInfo.method ?? null,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          traceId,
          correlationId,
          spanId,
          parentSpanId,
          userId: input.userId ?? null,
        });

        const forwardPromise = forwardToCentralizedLogging({
          level: input.level ?? 'info',
          message: input.message,
          source: input.source ?? null,
          service: service ?? null,
          category: category ?? null,
          context: hydratedContext,
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? (requestInfo.path ?? null) : null,
          method: requestInfo.method ?? null,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          traceId,
          correlationId,
          spanId,
          parentSpanId,
          userId: input.userId ?? null,
          fingerprint: fingerprint ?? null,
          createdAt: new Date().toISOString(),
        });
        const createSystemLog = shouldPersistSystemLogsToDatabase()
          ? await loadCreateSystemLog()
          : null;
        if (!createSystemLog) {
          await forwardPromise;
          return;
        }
        const created: SystemLogRecord = await createSystemLog({
          level: input.level ?? 'info',
          message: input.message,
          category: category ?? null,
          source: input.source ?? null,
          service: service ?? null,
          context: sanitizeValue(hydratedContext),
          stack: errorInfo?.stack ?? null,
          path: input.request?.url ? requestInfo.path : undefined,
          method: requestInfo.method,
          statusCode: input.statusCode ?? null,
          requestId: input.requestId ?? requestInfo.requestId ?? null,
          traceId,
          correlationId,
          spanId,
          parentSpanId,
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
        logSystemLoggerFailure('[system-logger] Failed to persist log asynchronously', err);
      }
    })();
  } catch (error) {
    logSystemLoggerFailure('[system-logger] Failed to process system log', error);
  }
}

export async function logSystemError(input: Omit<SystemLogInput, 'level'>): Promise<void> {
  await logSystemEvent({ ...input, level: 'error' });
}

export type { CentralLoggingRuntimeStats } from './system-logger-central-forwarding';
export { getCentralLoggingRuntimeStats } from './system-logger-central-forwarding';
export { ErrorSystem } from '../../utils/observability/error-system';
