import type { SystemLogLevel } from "@/types";
import { createSystemLog } from "@/lib/services/system-log-repository";

const MAX_CONTEXT_SIZE = 12000;

const sanitizeValue = (value: unknown) => {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        if (typeof val === "function") return "[Function]";
        if (typeof val === "bigint") return val.toString();
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

const normalizeError = (error: unknown) => {
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
};

export async function logSystemEvent(input: SystemLogInput) {
  try {
    const errorInfo = input.error ? normalizeError(input.error) : null;
    const requestInfo = extractRequestInfo(input.request);
    const context = {
      ...(input.context ?? {}),
      ...(errorInfo ? { error: errorInfo } : {}),
    };
    await createSystemLog({
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
  } catch (error) {
    console.error("[system-logger] Failed to write system log", error);
  }
}

export async function logSystemError(input: Omit<SystemLogInput, "level">) {
  await logSystemEvent({ ...input, level: "error" });
}
