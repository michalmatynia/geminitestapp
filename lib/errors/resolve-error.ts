import { randomUUID } from "crypto";
import { z } from "zod";
import {
  AppErrorCodes,
  internalError,
  isAppError,
  type AppErrorCode,
} from "@/lib/errors/app-error";

export type ResolvedError = {
  errorId: string;
  message: string;
  code: AppErrorCode;
  httpStatus: number;
  expected: boolean;
  meta?: Record<string, unknown> | undefined;
  cause?: unknown;
};

type ResolveOptions = {
  fallbackMessage?: string;
};

export const resolveError = (
  error: unknown,
  options?: ResolveOptions
): ResolvedError => {
  const errorId = randomUUID();

  if (isAppError(error)) {
    return {
      errorId,
      message: error.message,
      code: error.code,
      httpStatus: error.httpStatus,
      expected: error.expected,
      meta: error.meta,
      cause: error.cause,
    };
  }

  if (error instanceof z.ZodError) {
    return {
      errorId,
      message: "Invalid request payload",
      code: AppErrorCodes.validation,
      httpStatus: 400,
      expected: true,
      meta: { issues: error.flatten() },
      cause: error,
    };
  }

  const fallback = options?.fallbackMessage ?? "Unexpected error occurred";
  const internal = internalError(fallback);
  return {
    errorId,
    message: internal.message,
    code: internal.code,
    httpStatus: internal.httpStatus,
    expected: internal.expected,
    meta: internal.meta,
    cause: error,
  };
};
