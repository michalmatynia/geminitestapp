"use client";

import {
  isSensitiveKey,
  REDACTED_VALUE,
  truncateString,
} from "@/shared/lib/observability/log-redaction";

type ClientErrorContext = Record<string, unknown>;
type SerializedContext =
  | Record<string, unknown>
  | { truncated: true; preview: string }
  | { error: string }
  | null;

export type ClientErrorPayload = {
  message: string;
  name?: string;
  stack?: string | null;
  digest?: string;
  url?: string;
  userAgent?: string;
  componentStack?: string | null;
  context?: ClientErrorContext | null;
  timestamp?: string;
};

const MAX_CONTEXT_SIZE = 6000;
const MAX_VALUE_LENGTH = 2000;
let baseContext: ClientErrorContext = {};

export const setClientErrorBaseContext = (context: ClientErrorContext): void => {
  baseContext = { ...baseContext, ...context };
};

const safeSerialize = (value: unknown): SerializedContext => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(value, (_key: string, val: unknown) => {
      if (_key && isSensitiveKey(_key)) return REDACTED_VALUE;
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      if (typeof val === "function") return "[Function]";
      if (typeof val === "bigint") return val.toString();
      if (typeof val === "string") return truncateString(val, MAX_VALUE_LENGTH);
      return val;
    });
    if (!json) return null;
    if (json.length > MAX_CONTEXT_SIZE) {
      return { truncated: true, preview: json.slice(0, MAX_CONTEXT_SIZE) };
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { error: "Failed to serialize context." };
  }
};

const buildPayload = (
  error: unknown,
  extra?: {
    digest?: string;
    componentStack?: string | null;
    context?: ClientErrorContext | null;
  }
): ClientErrorPayload => {
  const payload: ClientErrorPayload = {
    message: "Unknown client error",
    timestamp: new Date().toISOString(),
    ...(typeof window !== "undefined"
      ? { url: window.location.href, userAgent: navigator.userAgent }
      : {}),
    ...(extra?.digest ? { digest: extra.digest } : {}),
    ...(extra?.componentStack ? { componentStack: extra.componentStack } : {}),
  };

  if (error instanceof Error) {
    payload.message = error.message;
    payload.name = error.name;
    payload.stack = error.stack ?? null;
  } else if (typeof error === "string") {
    payload.message = error;
  } else if (error && typeof error === "object") {
    payload.message =
      (error as { message?: string }).message ?? "Unknown client error";
    const errorName = (error as { name?: string }).name;
    if (errorName) payload.name = errorName;
  }

  const mergedContext =
    extra?.context || Object.keys(baseContext).length > 0
      ? { ...baseContext, ...(extra?.context ?? {}) }
      : null;
  if (mergedContext) {
    const serialized = safeSerialize(mergedContext);
    if (serialized) payload.context = serialized as ClientErrorContext;
  }

  return payload;
};

export const logClientError = (
  error: unknown,
  extra?: {
    digest?: string;
    componentStack?: string | null;
    context?: ClientErrorContext | null;
  }
): void => {
  if (typeof window === "undefined") return;
  const payload = buildPayload(error, extra);
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/client-errors", blob);
      return;
    }
  } catch {
    // fall back to fetch
  }

  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
};

let handlerAttached = false;

export const initClientErrorReporting = () => {
  if (handlerAttached || typeof window === "undefined") return;
  handlerAttached = true;

  // Expose for Playwright tests in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    (window as Window & { _logClientError?: typeof logClientError })._logClientError = logClientError;
  }

  window.addEventListener("error", (event: ErrorEvent) => {
    logClientError(event.error ?? event.message, {
      context: {
        source: "window.error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    logClientError(event.reason ?? "Unhandled promise rejection", {
      context: { source: "window.unhandledrejection" },
    });
  });
};
