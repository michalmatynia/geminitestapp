import type { ClientErrorPayloadDto as ClientErrorPayload } from '@/shared/contracts/observability';
import { classifyError } from '@/shared/errors/error-classifier';

import { isSensitiveKey, REDACTED_VALUE, truncateString } from './client-redaction';
import { isAbortLikeError } from './is-abort-like-error';
import { getLastUserAction, initUserActionTracker } from './user-action-tracker';
type ClientErrorContext = Record<string, unknown>;
type SerializedContext =
  | Record<string, unknown>
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
};

const safeSerialize = (value: unknown): SerializedContext => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(value, (_key: string, val: unknown) => {
      if (_key && isSensitiveKey(_key)) return REDACTED_VALUE;
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      if (typeof val === 'function') return '[Function]';
      if (typeof val === 'bigint') return val.toString();
      if (typeof val === 'string') return truncateString(val, MAX_VALUE_LENGTH);
      return val;
    });
    if (!json) return null;
    if (json.length > MAX_CONTEXT_SIZE) {
      return { truncated: true, preview: json.slice(0, MAX_CONTEXT_SIZE) };
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    logClientError(error);
    return { error: 'Failed to serialize context.' };
  }
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
  const payload: ClientErrorPayload = {
    message: 'Unknown client error',
    timestamp: new Date().toISOString(),
    ...(typeof window !== 'undefined'
      ? { url: window.location.href, userAgent: navigator.userAgent }
      : {}),
    ...(extra?.digest ? { digest: extra.digest } : {}),
    ...(extra?.componentStack ? { componentStack: extra.componentStack } : {}),
  };

  if (error instanceof Error) {
    payload.message = error.message;
    payload.name = error.name;
    payload.stack = error.stack ?? null;
  } else if (typeof error === 'string') {
    payload.message = error;
  } else if (error && typeof error === 'object') {
    payload.message = (error as { message?: string }).message ?? 'Unknown client error';
    const errorName = (error as { name?: string }).name;
    if (errorName) payload.name = errorName;
  }

  const mergedContext =
    extra?.context || Object.keys(baseContext).length > 0
      ? { ...baseContext, ...(extra?.context ?? {}) }
      : null;

  if (mergedContext || getLastUserAction() || category) {
    const contextToSerialize = {
      ...(mergedContext || {}),
      ...(category ? { category } : {}),
      ...(getLastUserAction() ? { lastAction: getLastUserAction() } : {}),
    };
    const serialized = safeSerialize(contextToSerialize);
    if (serialized) payload.context = serialized as ClientErrorContext;
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
  if (!message || !isTimeoutLikeMessage(message)) {
    return false;
  }

  const context =
    payload.context && typeof payload.context === 'object'
      ? (payload.context as ClientErrorContext)
      : null;
  const endpoint = readContextString(context, 'endpoint');
  const method = readContextString(context, 'method');
  const source = readContextString(context, 'source');
  const pageUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
  const signature = [message.toLowerCase(), endpoint, method, source, pageUrl].join(
    '::'
  );
  if (!signature.replace(/:/g, '').trim()) {
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

export const logClientError = (
  error: unknown,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
    context?: ClientErrorContext | null | undefined;
  }
): void => {
  if (typeof window === 'undefined') return;
  if (isAbortLikeError(error)) return;

  // Prevent double logging of the same error instance
  if (isLoggableObject(error) && error.__logged) {
    return;
  }

  const payload = buildPayload(error, extra);
  if (shouldSkipDuplicateClientTimeout(payload)) {
    return;
  }
  const body = JSON.stringify(payload);

  // Mark error as logged
  if (isLoggableObject(error)) {
    try {
      error.__logged = true;
    } catch (error) {
      logClientError(error);
    
      // Ignore frozen objects
    }
  }

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/client-errors', blob);
      return;
    }
  } catch (error) {
    logClientError(error);
  
    // fall back to fetch
  }

  void fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Swallow network failures for non-blocking client diagnostics.
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
