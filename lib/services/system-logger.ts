import { createHash } from "crypto";
import type { SystemLogLevel } from "@/types";
import { createSystemLog } from "@/lib/services/system-log-repository";
import { notifyCriticalError } from "@/lib/services/critical-error-notifier";
import {
  isSensitiveKey,
  REDACTED_VALUE,
  truncateString,
} from "@/lib/utils/log-redaction";

const MAX_CONTEXT_SIZE = 12000;
const MAX_VALUE_LENGTH = 4000;

const sanitizeValue = (value: unknown) => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(
      value,
      (_key, val) => {
        if (_key && isSensitiveKey(_key)) return REDACTED_VALUE;
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        if (typeof val === "function") return "[Function]";
        if (typeof val === "bigint") return val.toString();
        if (typeof val === "string") return truncateString(val, MAX_VALUE_LENGTH);
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
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed as unknown };
  } catch {
    return { error: "Failed to serialize context." };
  }
};

export const normalizeErrorInfo = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "Unknown error", raw: sanitizeValue(error) };
};

const extractRequestInfo = (request?: Request) => {
  if (!request) return {};
  try {
    const url = new URL(request.url);
    return {
      path: url.pathname,
      method: request.method,
      requestId: request.headers.get("x-request-id") ?? undefined,
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
  errorInfo?: { message?: string; stack?: string | undefined | null; name?: string } | null;
}) => {
  const hash = createHash("sha256");
  hash.update(input.message ?? "");
  hash.update(String(input.source ?? ""));
  hash.update(String(input.path ?? ""));
  hash.update(String(input.statusCode ?? ""));
  if (input.errorInfo) {
    hash.update(String(input.errorInfo.name ?? ""));
    hash.update(String(input.errorInfo.message ?? ""));
    const stack = input.errorInfo.stack ?? "";
    const normalizedStack = stack
      .split("\n")
      .slice(0, 6)
      .map((line) => line.replace(/\s+at\s+/g, " at ").trim())
      .join("\n");
    hash.update(normalizedStack);
  }
  return hash.digest("hex").slice(0, 16);
};

export const getErrorFingerprint = (input: {
  message: string;
  source?: string | null;
  request?: Request;
  statusCode?: number | null;
  error?: unknown;
}) => {
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
  statusCode?: number;
  userId?: string | null;
  requestId?: string | null;
  critical?: boolean;
};

export async function logSystemEvent(input: SystemLogInput) {
  try {
    const errorInfo = input.error ? normalizeErrorInfo(input.error) : null;
    const requestInfo = extractRequestInfo(input.request);
    const fingerprint =
      input.level === "error" || input.level === "warn" || errorInfo
        ? buildErrorFingerprint({
            message: input.message,
            source: input.source ?? null,
            path: input.request?.url ? requestInfo.path ?? null : null,
            statusCode: input.statusCode ?? null,
            errorInfo,
          })
        : null;
    const context = {
      ...(input.context ?? {}),
      ...(errorInfo ? { error: errorInfo } : {}),
      ...(fingerprint ? { fingerprint } : {}),
    };
    const created = await createSystemLog({
      level: input.level ?? "info",
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

    const critical =
      typeof input.critical === "boolean"
        ? input.critical
        : typeof input.context?.critical === "boolean"
          ? Boolean(input.context?.critical)
          : false;

    if (critical) {
      await notifyCriticalError(created, critical);
    }
  } catch (error) {
    console.error("[system-logger] Failed to write system log", error);
  }
}

export async function logSystemError(input: Omit<SystemLogInput, "level">) {
  await logSystemEvent({ ...input, level: "error" });
}
