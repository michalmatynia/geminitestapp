 
import type { UnknownRecord } from '@/shared/contracts/base';
import type {
  ClientErrorPayloadDto as ClientErrorPayload,
  SystemLogLevelDto as SystemLogLevel,
} from '@/shared/contracts/observability';
import { classifyError } from '@/shared/errors/error-classifier';
import {
  getObservabilityLoggingControlTypeForSystemLogLevel,
} from '@/shared/lib/observability/logging-controls';
import {
  isClientLoggingControlEnabled,
  resetClientLoggingControlsForTests,
} from '@/shared/lib/observability/logging-controls-client';

import { isSensitiveKey, REDACTED_VALUE, truncateString } from './client-redaction';
import { isAbortLikeError } from './is-abort-like-error';
import { getLastUserAction, initUserActionTracker } from './user-action-tracker';
export type ClientErrorContext = UnknownRecord;
type SerializedContext =
  | UnknownRecord
  | { truncated: true; preview: string }
  | { error: string }
  | null;

const MAX_CONTEXT_SIZE = 6000;
const MAX_VALUE_LENGTH = 2000;
const CLIENT_TIMEOUT_DEDUPE_WINDOW_MS = 20_000;
let baseContext: ClientErrorContext = {};
const recentClientErrorSignatures = new Map<string, number>();

export const setClientErrorBaseContext = (context: ClientErrorContext): void => {
  baseContext = { ...baseContext, ...context };
};

export const resetClientErrorLoggerStateForTests = (): void => {
  baseContext = {};
  recentClientErrorSignatures.clear();
  resetClientLoggingControlsForTests();
};

const safeSerialize = (value: unknown): SerializedContext => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(value, (_key: string, val: unknown) => {
      if (_key !== '' && isSensitiveKey(_key)) return REDACTED_VALUE;
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      if (typeof val === 'function') return '[Function]';
      if (typeof val === 'bigint') return val.toString();
      if (typeof val === 'string') return truncateString(val, MAX_VALUE_LENGTH);
      return val;
    });
    if (json.length === 0) return null;
    if (json.length > MAX_CONTEXT_SIZE) {
      return { truncated: true, preview: json.slice(0, MAX_CONTEXT_SIZE) };
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    logClientError(error);
    return { error: 'Failed to serialize context.' };
  }
};

const getErrorName = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.name;
  if (error !== null && typeof error === 'object') {
    const name = (error as { name?: string }).name;
    return typeof name === 'string' && name.length > 0 ? name : undefined;
  }
  return undefined;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error !== null && typeof error === 'object') {
    const msg = (error as { message?: string }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }
  return 'Unknown client error';
};

const resolveUrlAndAgent = (): { url?: string; userAgent?: string } => {
  const href = typeof window !== 'undefined' ? window.location.href : undefined;
  const url = typeof href === 'string' && href.length > 0 ? href : undefined;
  const agent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  const userAgent = typeof agent === 'string' && agent.length > 0 ? agent : undefined;
  return { url, userAgent };
};

const resolveMergedContext = (extra?: { context?: ClientErrorContext | null | undefined }, category?: string): ClientErrorContext | null => {
  const mergedContext = extra?.context ?? null;
  const hasBaseContext = Object.keys(baseContext).length > 0;
  
  let result: ClientErrorContext | null = null;
  if (mergedContext !== null || hasBaseContext) {
    result = { ...baseContext, ...(mergedContext ?? {}) };
  }

  const lastAction = getLastUserAction();
  if (result !== null || lastAction !== null || (category !== undefined && category.length > 0)) {
    const contextToSerialize = {
      ...(result ?? {}),
      ...(category !== undefined && category.length > 0 ? { category } : {}),
      ...(lastAction !== null ? { lastAction } : {}),
    };
    const serialized = safeSerialize(contextToSerialize);
    if (serialized !== null) return serialized as ClientErrorContext;
  }
  return null;
};

const buildPayload = (
  error: unknown,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
    context?: ClientErrorContext | null | undefined;
  }
): ClientErrorPayload => {
  const category = classifyError(error);
  const { url, userAgent } = resolveUrlAndAgent();

  const payload: ClientErrorPayload = {
    message: getErrorMessage(error),
    timestamp: new Date().toISOString(),
  };

  if (url !== undefined || userAgent !== undefined) {
    if (url !== undefined) payload.url = url;
    if (userAgent !== undefined) payload.userAgent = userAgent;
  }
  
  if (extra?.digest !== undefined && extra.digest !== null) {
    payload.digest = extra.digest;
  }
  if (extra?.componentStack !== undefined && extra.componentStack !== null) {
    payload.componentStack = extra.componentStack;
  }

  const name = getErrorName(error);
  if (name !== undefined) payload.name = name;

  if (error instanceof Error) {
    payload.stack = error.stack ?? null;
  }

  const context = resolveMergedContext(extra, category);
  if (context !== null) {
    payload.context = context;
  }

  return payload;
};

const isTimeoutLikeMessage = (message: string): boolean =>
  /^request timeout after \d+ms$/i.test(message.trim());

const readContextString = (context: ClientErrorContext | null | undefined, key: string): string =>
  typeof context?.[key] === 'string' ? context[key].trim() : '';

const pruneRecentClientErrorSignatures = (nowMs: number): void => {
  for (const [signature, lastSeenAt] of recentClientErrorSignatures.entries()) {
    if (nowMs - lastSeenAt > CLIENT_TIMEOUT_DEDUPE_WINDOW_MS * 2) {
      recentClientErrorSignatures.delete(signature);
    }
  }
};

const shouldSkipDuplicateClientTimeout = (payload: ClientErrorPayload): boolean => {
  const message = payload.message?.trim();
  if (message === undefined || !isTimeoutLikeMessage(message)) {
    return false;
  }

  const context = payload.context !== undefined && payload.context !== null && typeof payload.context === 'object'
      ? (payload.context as ClientErrorContext)
      : null;
  const endpoint = readContextString(context, 'endpoint');
  const method = readContextString(context, 'method');
  const source = readContextString(context, 'source');
  const pageUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
  const signature = [message.toLowerCase(), endpoint, method, source, pageUrl].join('::');
  
  if (signature.replace(/:/g, '').trim().length === 0) {
    return false;
  }

  const nowMs = Date.now();
  pruneRecentClientErrorSignatures(nowMs);
  const lastSeenAt = recentClientErrorSignatures.get(signature);
  if (typeof lastSeenAt === 'number' && nowMs - lastSeenAt < CLIENT_TIMEOUT_DEDUPE_WINDOW_MS) {
    return true;
  }

  recentClientErrorSignatures.set(signature, nowMs);
  return false;
};

export interface LoggableObject extends Record<string, unknown> {
  __logged?: boolean;
}

export const isLoggableObject = (error: unknown): error is LoggableObject =>
  typeof error === 'object' && error !== null;

const resolveClientLoggingLevel = (
  extra: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
    context?: ClientErrorContext | null | undefined;
  } | undefined
): SystemLogLevel => {
  const candidate = extra?.context?.['level'];
  if (candidate === 'info' || candidate === 'warn' || candidate === 'error') {
    return candidate;
  }
  return 'error';
};

const markAsLogged = (errorObj: unknown): void => {
  if (isLoggableObject(errorObj)) {
    try {
      // eslint-disable-next-line no-param-reassign
      errorObj.__logged = true;
    } catch (_ignoreErr) {
      // Ignore frozen objects
    }
  }
};

const sendClientErrorPayload = (payload: ClientErrorPayload): void => {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/client-errors', blob);
      return;
    }
  } catch (_beaconError) {
    // fall back to fetch
  }

  if (typeof fetch === 'function') {
     
    void fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Swallow network failures for non-blocking client diagnostics.
    });
  }
};

export const logClientError = (
  errorObj: unknown,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
    context?: ClientErrorContext | null | undefined;
  }
): void => {
  if (typeof window === 'undefined') return;
  if (isAbortLikeError(errorObj)) return;
  
  const loggingControlType = getObservabilityLoggingControlTypeForSystemLogLevel(
    resolveClientLoggingLevel(extra)
  );
  if (!isClientLoggingControlEnabled(loggingControlType)) return;

  // Prevent double logging of the same error instance
  if (isLoggableObject(errorObj) && errorObj.__logged === true) {
    return;
  }

  const payload = buildPayload(errorObj, extra);
  if (shouldSkipDuplicateClientTimeout(payload)) {
    return;
  }

  // Mark error as logged
  markAsLogged(errorObj);
  sendClientErrorPayload(payload);
};

export const logClientCatch = (
  errorObj: unknown,
  context: ClientErrorContext,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
  }
): void => {
  logClientError(errorObj, {
    ...(extra ?? {}),
    context,
  });
};

export const logClientEvent = (payload: {
  message: string;
  level?: SystemLogLevel;
  context?: ClientErrorContext;
}): void => {
  logClientError(payload.message, {
    context: {
      ...(payload.context ?? {}),
      level: payload.level ?? 'info',
    },
  });
};

let handlerAttached = false;

export const initClientErrorReporting = (): void => {
  if (handlerAttached || typeof window === 'undefined') return;
  handlerAttached = true;
  initUserActionTracker();

  // Expose for Playwright tests in non-production environments
  if (process.env['NODE_ENV'] !== 'production') {
    (window as Window & { _logClientError?: typeof logClientError })._logClientError =
      logClientError;
  }

  window.addEventListener('error', (event: ErrorEvent): void => {
    if (!(event.error instanceof Error)) {
      return;
    }

    logClientError(event.error, {
      context: {
        source: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
    logClientError(event.reason ?? 'Unhandled promise rejection', {
      context: { source: 'window.unhandledrejection' },
    });
  });
};
