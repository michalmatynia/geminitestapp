import { NextResponse } from "next/server";
import { resolveError } from "@/lib/errors/resolve-error";
import { logSystemEvent } from "@/lib/services/system-logger";

type ApiErrorOptions = {
  request?: Request | undefined;
  source?: string | undefined;
  fallbackMessage?: string | undefined;
  includeDetails?: boolean | undefined;
  extra?: Record<string, unknown> | undefined;
};

export const createErrorResponse = (
  error: unknown,
  options?: ApiErrorOptions
) => {
  const resolved = resolveError(error, { fallbackMessage: options?.fallbackMessage });
  const level = resolved.expected ? "warn" : "error";
  void logSystemEvent({
    level,
    message: resolved.message,
    source: options?.source ?? "api",
    error,
    request: options?.request,
    statusCode: resolved.httpStatus,
    context: {
      errorId: resolved.errorId,
      code: resolved.code,
      ...(resolved.meta ? { meta: resolved.meta } : {}),
    },
  });

  const payload: Record<string, unknown> = {
    error: resolved.message,
    code: resolved.code,
    errorId: resolved.errorId,
  };

  if (resolved.expected && resolved.meta) {
    payload.details = resolved.meta;
  } else if (options?.includeDetails && resolved.meta) {
    payload.details = resolved.meta;
  }

  if (options?.extra) {
    Object.assign(payload, options.extra);
  }

  return NextResponse.json(payload, { status: resolved.httpStatus });
};
